export type QueryValue = string | number | null;
export type QueryRow = Record<string, QueryValue>;

export type LogicalOperation =
  'FROM' | 'JOIN' | 'WHERE' | 'GROUP BY' | 'HAVING' | 'SELECT' | 'ORDER BY' | 'LIMIT';

export type QueryScenarioId = 'active-department-payroll' | 'dhaka-department-capacity';

export interface SourceTable {
  name: string;
  alias: string;
  description: string;
  rows: QueryRow[];
}

export interface QueryStage {
  id: string;
  operation: LogicalOperation;
  title: string;
  description: string;
  teachingPoint: string;
  rowsBefore: QueryRow[];
  rows: QueryRow[];
  visualFocus: 'source' | 'join' | 'filter' | 'group' | 'project' | 'sort' | 'limit';
}

export interface PhysicalPlanStep {
  order: number;
  operator: string;
  detail: string;
  estimatedOutputRows: number;
}

export interface ClausePrediction {
  id: string;
  prompt: string;
  correctAnswer: 'HAVING';
  options: Array<{ value: 'WHERE' | 'HAVING' | 'ORDER BY'; label: string; description: string }>;
  explanation: string;
  recoveryPrompt: string;
  xpReward: number;
}

export interface QueryScenario {
  id: QueryScenarioId;
  title: string;
  shortTitle: string;
  summary: string;
  goal: string;
  joinLabel: 'INNER JOIN' | 'LEFT JOIN';
  sql: string;
  sourceTables: SourceTable[];
  stages: QueryStage[];
  physicalPlan: PhysicalPlanStep[];
  physicalPlanCaveat: string;
  prediction: ClausePrediction;
  predictionAfterStage: number;
}

export interface ClausePredictionResult {
  correct: boolean;
  answer: string;
  correctAnswer: 'HAVING';
  misconception: 'where-vs-having' | null;
  feedback: string;
}

const departments: QueryRow[] = [
  {
    department_id: 10,
    department_name: 'Engineering',
    office: 'Dhaka',
    annual_budget: 350000
  },
  { department_id: 20, department_name: 'Sales', office: 'London', annual_budget: 250000 },
  { department_id: 30, department_name: 'Support', office: 'Dhaka', annual_budget: 140000 },
  { department_id: 40, department_name: 'People', office: 'Dhaka', annual_budget: 100000 }
];

const employees: QueryRow[] = [
  {
    employee_id: 101,
    employee_name: 'Aisha',
    department_id: 10,
    salary: 120000,
    status: 'Active'
  },
  {
    employee_id: 102,
    employee_name: 'Farhan',
    department_id: 10,
    salary: 100000,
    status: 'Active'
  },
  {
    employee_id: 103,
    employee_name: 'Mina',
    department_id: 10,
    salary: 80000,
    status: 'Leave'
  },
  {
    employee_id: 201,
    employee_name: 'Omar',
    department_id: 20,
    salary: 90000,
    status: 'Active'
  },
  {
    employee_id: 202,
    employee_name: 'Nila',
    department_id: 20,
    salary: 75000,
    status: 'Active'
  },
  {
    employee_id: 203,
    employee_name: 'Theo',
    department_id: 20,
    salary: 70000,
    status: 'Leave'
  },
  {
    employee_id: 301,
    employee_name: 'Rafi',
    department_id: 30,
    salary: 65000,
    status: 'Active'
  },
  {
    employee_id: 302,
    employee_name: 'Lena',
    department_id: 30,
    salary: 60000,
    status: 'Leave'
  },
  {
    employee_id: 901,
    employee_name: 'Iman',
    department_id: null,
    salary: 72000,
    status: 'Active'
  }
];

function cloneRows(rows: readonly QueryRow[]): QueryRow[] {
  return rows.map((row) => ({ ...row }));
}

function sourceTables(): SourceTable[] {
  return [
    {
      name: 'departments',
      alias: 'd',
      description: 'Four departments, including People with no matching employee rows.',
      rows: cloneRows(departments)
    },
    {
      name: 'employees',
      alias: 'e',
      description: 'Nine employees; Iman is not assigned to a department.',
      rows: cloneRows(employees)
    }
  ];
}

function stage(
  scenarioId: QueryScenarioId,
  operation: LogicalOperation,
  title: string,
  description: string,
  teachingPoint: string,
  rowsBefore: readonly QueryRow[],
  rows: readonly QueryRow[],
  visualFocus: QueryStage['visualFocus']
): QueryStage {
  return {
    id: `${scenarioId}:${operation.toLowerCase().replaceAll(' ', '-')}`,
    operation,
    title,
    description,
    teachingPoint,
    rowsBefore: cloneRows(rowsBefore),
    rows: cloneRows(rows),
    visualFocus
  };
}

function departmentFor(id: QueryValue) {
  return departments.find((department) => department.department_id === id);
}

function activeDepartmentPayroll(): QueryScenario {
  const id: QueryScenarioId = 'active-department-payroll';
  const from = cloneRows(employees);
  const joined: QueryRow[] = from.flatMap((employee): QueryRow[] => {
    const department = departmentFor(employee.department_id);
    return department
      ? [
          {
            ...employee,
            department_name: department.department_name,
            office: department.office
          }
        ]
      : [];
  });
  const filtered: QueryRow[] = joined.filter((row) => row.status === 'Active');
  const grouped: QueryRow[] = departments.flatMap((department): QueryRow[] => {
    const members = filtered.filter(
      (employee) => employee.department_id === department.department_id
    );
    if (!members.length) return [];
    const totalSalary = members.reduce((sum, employee) => sum + Number(employee.salary), 0);
    return [
      {
        department_id: department.department_id,
        department_name: department.department_name,
        active_employees: members.length,
        total_salary: totalSalary,
        average_salary: totalSalary / members.length,
        group_members: members.map((member) => member.employee_name).join(', ')
      }
    ];
  });
  const having: QueryRow[] = grouped.filter((row) => Number(row.active_employees) >= 2);
  const selected: QueryRow[] = having.map((row) => ({
    department: row.department_name,
    active_employees: row.active_employees,
    total_salary: row.total_salary,
    average_salary: row.average_salary
  }));
  const ordered: QueryRow[] = [...selected].sort(
    (left, right) => Number(right.average_salary) - Number(left.average_salary)
  );
  const limited: QueryRow[] = ordered.slice(0, 2);
  const stages = [
    stage(
      id,
      'FROM',
      'Start with employee rows',
      'FROM establishes the first working relation: all nine employee rows.',
      'Logical evaluation begins with row sources, even though SELECT is written first.',
      [],
      from,
      'source'
    ),
    stage(
      id,
      'JOIN',
      'Match departments',
      'INNER JOIN matches department_id values. Iman has no match, so that row leaves the pipeline.',
      'An inner join retains only matching pairs from both inputs.',
      from,
      joined,
      'join'
    ),
    stage(
      id,
      'WHERE',
      'Filter individual employees',
      "WHERE keeps rows whose status is 'Active' before any groups exist.",
      'WHERE can inspect individual source or joined rows, not aggregate group totals.',
      joined,
      filtered,
      'filter'
    ),
    stage(
      id,
      'GROUP BY',
      'Build department buckets',
      'Rows with the same department form one bucket; COUNT, SUM, and AVG are calculated per bucket.',
      'Grouping changes the unit of work from one employee to one department.',
      filtered,
      grouped,
      'group'
    ),
    stage(
      id,
      'HAVING',
      'Filter aggregate groups',
      'HAVING removes Support because its active employee count is below two.',
      'HAVING runs after grouping, so it can use COUNT, SUM, and AVG.',
      grouped,
      having,
      'filter'
    ),
    stage(
      id,
      'SELECT',
      'Project the requested columns',
      'SELECT keeps the named output fields and applies their aliases.',
      'Projection shapes columns; it does not decide which source rows enter a group.',
      having,
      selected,
      'project'
    ),
    stage(
      id,
      'ORDER BY',
      'Rank by average salary',
      'ORDER BY sorts the projected groups from highest to lowest average salary.',
      'Sorting occurs after the output expressions are available.',
      selected,
      ordered,
      'sort'
    ),
    stage(
      id,
      'LIMIT',
      'Keep at most two results',
      'LIMIT returns only the first two rows in the established order.',
      'Without ORDER BY, which rows LIMIT returns is not a meaningful ranking guarantee.',
      ordered,
      limited,
      'limit'
    )
  ];

  return {
    id,
    title: 'Active department payroll',
    shortTitle: 'Active payroll',
    summary:
      'Find the two departments with at least two active employees and the highest average pay.',
    goal: 'Trace an INNER JOIN and decide where row filters end and group filters begin.',
    joinLabel: 'INNER JOIN',
    sql: `SELECT d.department_name AS department,
       COUNT(e.employee_id) AS active_employees,
       SUM(e.salary) AS total_salary,
       AVG(e.salary) AS average_salary
FROM employees e
INNER JOIN departments d
  ON d.department_id = e.department_id
WHERE e.status = 'Active'
GROUP BY d.department_id, d.department_name
HAVING COUNT(e.employee_id) >= 2
ORDER BY average_salary DESC
LIMIT 2;`,
    sourceTables: sourceTables(),
    stages,
    physicalPlan: [
      {
        order: 1,
        operator: 'Filtered employee scan',
        detail: "A possible engine could apply status = 'Active' while scanning employees.",
        estimatedOutputRows: 6
      },
      {
        order: 2,
        operator: 'Department hash build',
        detail: 'Build a small lookup keyed by department_id.',
        estimatedOutputRows: 4
      },
      {
        order: 3,
        operator: 'Hash inner join',
        detail: 'Probe the department lookup; the unassigned employee has no match.',
        estimatedOutputRows: 5
      },
      {
        order: 4,
        operator: 'Hash aggregate + group filter',
        detail: 'Accumulate COUNT, SUM, and AVG by department, then keep counts of at least two.',
        estimatedOutputRows: 2
      },
      {
        order: 5,
        operator: 'Top-N sort',
        detail: 'Rank aggregate results by average salary and retain at most two.',
        estimatedOutputRows: 2
      }
    ],
    physicalPlanCaveat:
      'This is an illustrative possible plan, not output captured from a database optimizer. Real plans vary with indexes, statistics, data size, engine, and configuration.',
    prediction: clausePrediction(id, 2),
    predictionAfterStage: 3
  };
}

function dhakaDepartmentCapacity(): QueryScenario {
  const id: QueryScenarioId = 'dhaka-department-capacity';
  const from = cloneRows(departments);
  const joined: QueryRow[] = from.flatMap((department): QueryRow[] => {
    const members = employees.filter(
      (employee) => employee.department_id === department.department_id
    );
    if (!members.length) {
      return [
        {
          ...department,
          employee_id: null,
          employee_name: null,
          salary: null,
          status: null
        }
      ];
    }
    return members.map((employee) => ({
      ...department,
      employee_id: employee.employee_id,
      employee_name: employee.employee_name,
      salary: employee.salary,
      status: employee.status
    }));
  });
  const filtered: QueryRow[] = joined.filter((row) => row.office === 'Dhaka');
  const grouped: QueryRow[] = departments
    .filter((department) => department.office === 'Dhaka')
    .map((department) => {
      const members = filtered.filter(
        (employee) =>
          employee.department_id === department.department_id && employee.employee_id !== null
      );
      const totalSalary = members.reduce((sum, employee) => sum + Number(employee.salary), 0);
      return {
        department_id: department.department_id,
        department_name: department.department_name,
        staff_count: members.length,
        total_salary: members.length ? totalSalary : null,
        average_salary: members.length ? totalSalary / members.length : null,
        group_members: members.length
          ? members.map((member) => member.employee_name).join(', ')
          : '(empty group)'
      };
    });
  const having: QueryRow[] = grouped.filter((row) => Number(row.staff_count) >= 2);
  const selected: QueryRow[] = having.map((row) => ({
    department: row.department_name,
    staff_count: row.staff_count,
    total_salary: row.total_salary,
    average_salary: row.average_salary
  }));
  const ordered: QueryRow[] = [...selected].sort(
    (left, right) => Number(right.total_salary) - Number(left.total_salary)
  );
  const limited: QueryRow[] = ordered.slice(0, 1);
  const stages = [
    stage(
      id,
      'FROM',
      'Start with departments',
      'FROM begins with every department, including People, which currently has no employees.',
      'The left-side table determines which unmatched rows a LEFT JOIN can preserve.',
      [],
      from,
      'source'
    ),
    stage(
      id,
      'JOIN',
      'Preserve unmatched departments',
      'LEFT JOIN expands departments into employee matches and keeps People with NULL employee fields.',
      'A LEFT JOIN preserves an unmatched left row; COUNT(employee_id) later ignores its NULL.',
      from,
      joined,
      'join'
    ),
    stage(
      id,
      'WHERE',
      'Keep Dhaka rows',
      "WHERE checks the department office on each joined row and keeps office = 'Dhaka'.",
      'Filtering a left-table column preserves the unmatched People row; filtering a right-table value could remove it.',
      joined,
      filtered,
      'filter'
    ),
    stage(
      id,
      'GROUP BY',
      'Build one row per department',
      'The six joined rows become three Dhaka department groups. People has COUNT(employee_id) = 0.',
      'COUNT(column) ignores NULL, while COUNT(*) would count the preserved placeholder row.',
      filtered,
      grouped,
      'group'
    ),
    stage(
      id,
      'HAVING',
      'Require two employee matches',
      'HAVING evaluates each completed group and removes People because 0 < 2.',
      'Aggregate conditions belong in HAVING because their values do not exist before GROUP BY.',
      grouped,
      having,
      'filter'
    ),
    stage(
      id,
      'SELECT',
      'Shape the report',
      'SELECT presents the department name and the three calculated measures.',
      'Aliases make aggregate expressions easier to read in the final relation.',
      having,
      selected,
      'project'
    ),
    stage(
      id,
      'ORDER BY',
      'Rank payroll totals',
      'ORDER BY places the largest total salary first.',
      'The sort uses aggregate output, not the order of source rows.',
      selected,
      ordered,
      'sort'
    ),
    stage(
      id,
      'LIMIT',
      'Return the top department',
      'LIMIT 1 keeps Engineering, the first row after payroll ranking.',
      'LIMIT trims an ordered result; it does not change the aggregate calculations.',
      ordered,
      limited,
      'limit'
    )
  ];

  return {
    id,
    title: 'Dhaka department capacity',
    shortTitle: 'Dhaka capacity',
    summary:
      'Use a LEFT JOIN to find the highest-payroll Dhaka department with at least two employees.',
    goal: 'See NULL-preserving joins, COUNT(column), grouping, and aggregate filtering in one trace.',
    joinLabel: 'LEFT JOIN',
    sql: `SELECT d.department_name AS department,
       COUNT(e.employee_id) AS staff_count,
       SUM(e.salary) AS total_salary,
       AVG(e.salary) AS average_salary
FROM departments d
LEFT JOIN employees e
  ON e.department_id = d.department_id
WHERE d.office = 'Dhaka'
GROUP BY d.department_id, d.department_name
HAVING COUNT(e.employee_id) >= 2
ORDER BY total_salary DESC
LIMIT 1;`,
    sourceTables: sourceTables(),
    stages,
    physicalPlan: [
      {
        order: 1,
        operator: 'Filtered department scan',
        detail: "A possible engine could push office = 'Dhaka' into the department scan.",
        estimatedOutputRows: 3
      },
      {
        order: 2,
        operator: 'Employee hash build',
        detail: 'Build department_id buckets from employee rows.',
        estimatedOutputRows: 8
      },
      {
        order: 3,
        operator: 'Hash left join',
        detail: 'Emit employee matches and a NULL-extended row for People.',
        estimatedOutputRows: 6
      },
      {
        order: 4,
        operator: 'Hash aggregate + group filter',
        detail:
          'Count non-NULL employee_id values, calculate pay measures, and retain groups >= 2.',
        estimatedOutputRows: 2
      },
      {
        order: 5,
        operator: 'Top-N sort',
        detail: 'Rank by payroll and stop after the first row.',
        estimatedOutputRows: 1
      }
    ],
    physicalPlanCaveat:
      'This is an illustrative possible plan, not output captured from a database optimizer. A real engine may choose different scans, joins, and aggregate strategies.',
    prediction: clausePrediction(id, 2),
    predictionAfterStage: 3
  };
}

function clausePrediction(id: QueryScenarioId, threshold: number): ClausePrediction {
  return {
    id: `${id}:where-vs-having`,
    prompt: `The report should keep only departments with COUNT(employee_id) >= ${threshold}. Which clause evaluates that condition?`,
    correctAnswer: 'HAVING',
    options: [
      {
        value: 'WHERE',
        label: 'WHERE',
        description: 'Filters individual rows before groups and aggregate values exist.'
      },
      {
        value: 'HAVING',
        label: 'HAVING',
        description: 'Filters completed groups using COUNT, SUM, or AVG.'
      },
      {
        value: 'ORDER BY',
        label: 'ORDER BY',
        description: 'Sorts result rows; it does not decide which aggregate groups qualify.'
      }
    ],
    explanation:
      'COUNT(employee_id) is produced by GROUP BY, so the condition belongs in HAVING. WHERE runs too early to inspect that aggregate.',
    recoveryPrompt:
      'Choose the clause that runs after GROUP BY and can inspect COUNT(employee_id).',
    xpReward: 8
  };
}

export const QUERY_SCENARIOS: Array<{
  id: QueryScenarioId;
  title: string;
  joinLabel: QueryScenario['joinLabel'];
}> = [
  { id: 'active-department-payroll', title: 'Active department payroll', joinLabel: 'INNER JOIN' },
  { id: 'dhaka-department-capacity', title: 'Dhaka department capacity', joinLabel: 'LEFT JOIN' }
];

export function createQueryScenario(id: QueryScenarioId = 'active-department-payroll') {
  return id === 'dhaka-department-capacity' ? dhakaDepartmentCapacity() : activeDepartmentPayroll();
}

export function createQueryPipeline(id: QueryScenarioId = 'active-department-payroll') {
  return createQueryScenario(id).stages;
}

export function evaluateClausePrediction(answer: string): ClausePredictionResult {
  const normalized = answer.trim().toUpperCase();
  const correct = normalized === 'HAVING';
  return {
    correct,
    answer: normalized,
    correctAnswer: 'HAVING',
    misconception: correct ? null : 'where-vs-having',
    feedback: correct
      ? 'Correct. HAVING evaluates aggregate groups after GROUP BY.'
      : 'Not quite. WHERE evaluates individual rows before grouping; HAVING can inspect COUNT, SUM, and AVG.'
  };
}
