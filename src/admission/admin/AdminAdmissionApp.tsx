import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../utils/supabase/client';
import { University, Department, StudentMatrixRow, DdayItem, StudentApplication, AdmissionStatus } from '../types';
import { UniversityManager } from './components/UniversityManager';
import { StudentStatusMatrix } from './components/StudentStatusMatrix';
import { UniversityApplicants } from './components/UniversityApplicants';
import { DeadlineDashboard } from './components/DeadlineDashboard';
import '../../styles/admission.css';

type AdminTab = 'universities' | 'matrix' | 'applicants' | 'dday';

const STATUS_EMOJI: Record<AdmissionStatus, string> = {
  관심: '⭕',
  원서작성: '📝',
  제출완료: '✅',
  '1차합격': '🎯',
  '최종합격': '🏆'
};

export function AdminAdmissionApp() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [tab, setTab] = useState<AdminTab>('universities');
  const [universities, setUniversities] = useState<University[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [matrix, setMatrix] = useState<StudentMatrixRow[]>([]);
  const [applicants, setApplicants] = useState<StudentApplication[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [ddayItems, setDdayItems] = useState<DdayItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUniversities = async () => {
    const { data } = await supabase.from('universities').select('*').order('name');
    setUniversities(data || []);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*');
    setDepartments(data || []);
  };

  const fetchMatrix = async () => {
    const { data } = await supabase.functions.invoke<StudentMatrixRow[]>('admission-manager', {
      body: { action: 'get-student-matrix' }
    });
    setMatrix(data || []);
  };

  const fetchApplicants = async (universityId?: string) => {
    if (!universityId) return;
    const { data } = await supabase
      .from('student_applications')
      .select('id,student_id,university_id,department_id,status,admin_notes,profiles:student_id(full_name),universities(name),departments(name)')
      .eq('university_id', universityId);

    const mapped: StudentApplication[] =
      data?.map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        student_name: row.profiles?.full_name || '학생',
        university_id: row.university_id,
        university_name: row.universities?.name,
        department_id: row.department_id,
        department_name: row.departments?.name,
        status: row.status,
        admin_notes: row.admin_notes
      })) || [];
    setApplicants(mapped);
  };

  const fetchDday = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke<DdayItem[]>('admission-manager', {
        body: { action: 'get-dday-board' }
      });
      setDdayItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
    fetchDepartments();
    fetchMatrix();
    fetchDday();
  }, []);

  useEffect(() => {
    if (selectedUniversity) {
      fetchApplicants(selectedUniversity);
    }
  }, [selectedUniversity]);

  const handleStatusChange = async (studentId: string, universityId: string, status: AdmissionStatus) => {
    await supabase.functions.invoke('admission-manager', {
      body: { action: 'update-status', payload: { studentId, universityId, status } }
    });
    fetchMatrix();
    if (selectedUniversity) fetchApplicants(selectedUniversity);
  };

  const handleExport = () => {
    const headers = ['학생명', ...universities.map((u) => u.name)];
    const rows = matrix.map((row) => [
      row.studentName,
      ...universities.map((u) => (row.statuses[u.id] ? STATUS_EMOJI[row.statuses[u.id] as AdmissionStatus] : '-'))
    ]);
    const csv = [headers, ...rows].map((line) => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admission-status-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="admission-admin-root">
      <header className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-sm uppercase tracking-[0.3em] text-[#7c3aed] font-semibold">Admission Manager</p>
        <h1 className="text-3xl font-black text-[#1e1b4b] mt-2">입시 관리 대시보드</h1>
        <p className="text-[#4c1d95]">원서 일정과 학생 현황을 한 번에 확인하고 관리하세요.</p>
        <div className="flex gap-3 mt-6 flex-wrap">
          <button className={`admission-button-primary ${tab === 'universities' ? '!bg-[#4c1d95]' : ''}`} onClick={() => setTab('universities')}>
            대학 정보
          </button>
          <button className={`admission-button-primary ${tab === 'matrix' ? '!bg-[#4c1d95]' : ''}`} onClick={() => setTab('matrix')}>
            지원 매트릭스
          </button>
          <button className={`admission-button-primary ${tab === 'applicants' ? '!bg-[#4c1d95]' : ''}`} onClick={() => setTab('applicants')}>
            대학별 지원자
          </button>
          <button className={`admission-button-primary ${tab === 'dday' ? '!bg-[#4c1d95]' : ''}`} onClick={() => setTab('dday')}>
            D-day 보드
          </button>
          <button className="admission-button-primary ml-auto" onClick={handleExport}>
            전체 현황 엑셀 다운로드
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 admission-grid">
        {tab === 'universities' && (
          <UniversityManager
            universities={universities}
            departments={departments}
            onRefresh={() => {
              fetchUniversities();
              fetchDepartments();
            }}
          />
        )}

        {tab === 'matrix' && (
          <StudentStatusMatrix
            universities={universities}
            matrix={matrix}
            onChangeStatus={handleStatusChange}
          />
        )}

        {tab === 'applicants' && (
          <UniversityApplicants
            universities={universities}
            applicants={applicants}
            selectedUniversity={selectedUniversity}
            onSelectUniversity={setSelectedUniversity}
          />
        )}

        {tab === 'dday' && (
          <DeadlineDashboard loading={loading} items={ddayItems} />
        )}
      </main>
    </div>
  );
}
