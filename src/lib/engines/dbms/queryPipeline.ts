export type Row = Record<string, string | number>;
export interface QueryStage {
  operation: string;
  description: string;
  rows: Row[];
}
const departments = [
  { department_id: 1, department_name: 'Engineering' },
  { department_id: 2, department_name: 'Sales' },
  { department_id: 3, department_name: 'Support' }
];
const employees = [
  { employee_id: 1, department_id: 1, salary: 120000, status: 'Active' },
  { employee_id: 2, department_id: 1, salary: 100000, status: 'Active' },
  { employee_id: 3, department_id: 2, salary: 90000, status: 'Active' },
  { employee_id: 4, department_id: 2, salary: 70000, status: 'Leave' },
  { employee_id: 5, department_id: 3, salary: 65000, status: 'Active' }
];
export function createQueryPipeline(): QueryStage[] {
  const from = employees.map((e) => ({ ...e }));
  const joined = from.map((e) => ({
    ...e,
    department_name: departments.find((d) => d.department_id === e.department_id)!.department_name
  }));
  const filtered = joined.filter((e) => e.status === 'Active');
  const grouped = Object.values(
    filtered.reduce<
      Record<string, { department_name: string; employee_count: number; total_salary: number }>
    >((a, e) => {
      const g = (a[e.department_name] ??= {
        department_name: e.department_name,
        employee_count: 0,
        total_salary: 0
      });
      g.employee_count++;
      g.total_salary += e.salary;
      return a;
    }, {})
  );
  const selected = grouped.map((g) => ({
    department_name: g.department_name,
    employee_count: g.employee_count,
    average_salary: g.total_salary / g.employee_count
  }));
  const sorted = [...selected].sort((a, b) => Number(b.average_salary) - Number(a.average_salary));
  return [
    { operation: 'FROM', description: 'Read the employee rows.', rows: from },
    { operation: 'JOIN', description: 'Match each employee to a department.', rows: joined },
    { operation: 'WHERE', description: "Keep only status = 'Active'.", rows: filtered },
    { operation: 'GROUP BY', description: 'Form one bucket per department.', rows: grouped },
    {
      operation: 'SELECT',
      description: 'Calculate COUNT and AVG for each bucket.',
      rows: selected
    },
    { operation: 'ORDER BY', description: 'Sort by average salary descending.', rows: sorted },
    { operation: 'LIMIT', description: 'Keep the first two groups.', rows: sorted.slice(0, 2) }
  ];
}
