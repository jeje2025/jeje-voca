import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../utils/supabase/client';
import { Department, University } from '../types';
import '../../styles/admission.css';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
}

interface DepartmentResult {
  university_id: string;
  university_name: string;
  department_id: string;
  department_name: string;
  quota?: number | null;
  competition_rate?: number | null;
  application_start?: string | null;
  application_end?: string | null;
  exam_date?: string | null;
  result_date?: string | null;
}

const EVENT_COLORS = {
  application_end: '#f43f5e',
  exam_date: '#2563eb',
  result_date: '#22c55e'
};

const STATUS_LABEL: Record<string, string> = {
  관심: '관심 등록',
  원서작성: '원서 작성 중',
  제출완료: '제출 완료',
  '1차합격': '1차 합격',
  '최종합격': '최종 합격'
};

const getMonthMatrix = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: Array<Array<{ day: number | null; date: Date | null }>> = [];
  let currentDay = 1 - startDay;

  for (let week = 0; week < 6; week++) {
    const row: Array<{ day: number | null; date: Date | null }> = [];
    for (let day = 0; day < 7; day++) {
      if (currentDay < 1 || currentDay > daysInMonth) {
        row.push({ day: null, date: null });
      } else {
        row.push({ day: currentDay, date: new Date(year, month, currentDay) });
      }
      currentDay++;
    }
    weeks.push(row);
  }
  return weeks;
};

export function StudentCalendarScreen() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<DepartmentResult[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentKeyword, setDepartmentKeyword] = useState('경영학과');
  const [departmentTable, setDepartmentTable] = useState<DepartmentResult[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const fetchMyApplications = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('student_applications')
      .select('id,status,universities(name,application_start,application_end,exam_date,result_date),departments(name)')
      .eq('student_id', userId);
    const mapped =
      data?.map((row: any) => ({
        id: row.id,
        status: row.status,
        university_name: row.universities?.name,
        department_name: row.departments?.name,
        ...row.universities
      })) || [];
    setMyApplications(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchMyApplications();
  }, [userId]);

  useEffect(() => {
    const list: CalendarEvent[] = [];
    myApplications.forEach((application) => {
      ['application_end', 'exam_date', 'result_date'].forEach((key) => {
        const value = application?.[key];
        if (value) {
          list.push({
            id: `${application.id}-${key}`,
            title: `${application.universities?.name || application.university_name} ${{
              application_end: '원서마감',
              exam_date: '시험',
              result_date: '발표'
            }[key as 'application_end' | 'exam_date' | 'result_date']}`,
            date: value,
            color: EVENT_COLORS[key as keyof typeof EVENT_COLORS]
          });
        }
      });
    });
    setEvents(list);
  }, [myApplications]);

  const handleSearch = async () => {
    const { data } = await supabase.functions.invoke<DepartmentResult[]>('admission-manager', {
      body: { action: 'search-departments', payload: { keyword: searchKeyword } }
    });
    setSearchResults(data || []);
  };

  const registerInterest = async (department: DepartmentResult) => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }
    await supabase.from('student_applications').upsert({
      student_id: userId,
      university_id: department.university_id,
      department_id: department.department_id,
      status: '관심'
    });
    fetchMyApplications();
    alert(`${department.university_name} ${department.department_name} 관심 등록 완료!`);
  };

  const handleDepartmentSearch = async () => {
    const { data } = await supabase.functions.invoke<DepartmentResult[]>('admission-manager', {
      body: { action: 'search-departments', payload: { keyword: departmentKeyword } }
    });
    setDepartmentTable(data || []);
  };

  const weeks = getMonthMatrix(calendarMonth);

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = event.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ede9fe] to-[#cffafe] py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        <header className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.4em] text-[#7c3aed]">Student Planner</p>
          <h1 className="text-3xl font-black text-[#1e1b4b]">내 편입 지원 캘린더</h1>
          <p className="text-gray-600">관심 대학을 등록하고 원서/시험/발표 일정을 한눈에 확인하세요.</p>
        </header>

        <section className="admission-card space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="flex-1 border rounded-2xl px-4 py-3"
              placeholder="대학명 혹은 학과명으로 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <button className="admission-button-primary" onClick={handleSearch}>
              검색
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {searchResults.map((result) => (
              <div key={result.department_id} className="border rounded-2xl p-4 bg-white/90">
                <p className="text-sm text-[#7c3aed] uppercase tracking-[0.2em]">{result.university_name}</p>
                <h3 className="text-xl font-bold">{result.department_name}</h3>
                <p className="text-sm text-gray-500">
                  정원 {result.quota || '-'}명 / 경쟁률 {result.competition_rate || '-'}
                </p>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>원서: {result.application_start || '-'} ~ {result.application_end || '-'}</p>
                  <p>시험: {result.exam_date || '-'}</p>
                  <p>발표: {result.result_date || '-'}</p>
                </div>
                <button className="admission-button-primary mt-3" onClick={() => registerInterest(result)}>
                  관심 등록
                </button>
              </div>
            ))}
            {!searchResults.length && <p className="text-center text-gray-500 col-span-full">검색 결과가 없습니다.</p>}
          </div>
        </section>

        <section className="admission-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="admission-section-title">내 지원 캘린더</p>
              <p className="text-sm text-gray-500">원서 마감(핑크), 시험(파랑), 발표(초록) 일정이 표시됩니다.</p>
            </div>
            <div className="flex gap-2">
              <button
                className="admission-button-primary"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              >
                이전
              </button>
              <button
                className="admission-button-primary"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              >
                다음
              </button>
            </div>
          </div>

          <div className="text-center font-semibold text-lg">
            {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
          </div>

          <table className="admission-calendar">
            <thead>
              <tr>
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((cell, index) => {
                    if (!cell.date) return <td key={index}></td>;
                    const isoDate = cell.date.toISOString().slice(0, 10);
                    const dayEvents = eventsByDate[isoDate] || [];
                    return (
                      <td
                        key={index}
                        className={dayEvents.length ? 'has-event' : ''}
                      >
                        <div className="font-semibold">{cell.day}</div>
                        <div className="space-y-1 mt-1">
                          {dayEvents.map((event) => (
                            <div key={event.id} className="text-[10px] flex items-center justify-center gap-1 text-gray-600">
                              <span className="admission-event-dot" style={{ background: event.color }} />
                              {event.title}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p className="text-center text-gray-500">일정을 불러오는 중...</p>}
        </section>

        <section className="admission-card space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="admission-section-title">학과별 비교</p>
              <p className="text-sm text-gray-500">원하는 학과명을 입력하면 모든 대학 모집 정보를 비교할 수 있습니다.</p>
            </div>
            <div className="flex gap-2 flex-1">
              <input
                className="flex-1 border rounded-2xl px-3 py-2"
                value={departmentKeyword}
                onChange={(e) => setDepartmentKeyword(e.target.value)}
              />
              <button className="admission-button-primary" onClick={handleDepartmentSearch}>
                조회
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-gray-500">
                  <th className="py-2">대학</th>
                  <th>학과</th>
                  <th>정원</th>
                  <th>경쟁률</th>
                  <th>원서</th>
                  <th>시험</th>
                  <th>발표</th>
                </tr>
              </thead>
              <tbody>
                {departmentTable.map((row) => (
                  <tr key={row.department_id} className="border-t">
                    <td className="py-2 font-semibold">{row.university_name}</td>
                    <td>{row.department_name}</td>
                    <td>{row.quota || '-'}</td>
                    <td>{row.competition_rate || '-'}</td>
                    <td className="text-xs">
                      {row.application_start || '-'} ~ {row.application_end || '-'}
                    </td>
                    <td>{row.exam_date || '-'}</td>
                    <td>{row.result_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!departmentTable.length && <p className="text-center text-gray-500 py-6">조회된 학과가 없습니다.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
