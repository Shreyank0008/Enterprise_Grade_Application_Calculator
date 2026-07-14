import { memo, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LockIcon from '@mui/icons-material/Lock';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ALL_PARAMETERS, CATEGORIES } from '../data/parameters';
import type { Category, Parameter } from '../types';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { WEIGHTAGE_OPTIONS, formatNumber } from '../utils/calc';

type FilterMode = 'all' | 'assessed' | 'pending';

const columnHelper = createColumnHelper<Parameter>();

/* Column definitions: used by TanStack for the header row and global
   (search) filtering. Body rows are rendered by memoized components so a
   weightage change re-renders only the affected row — not all 205. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COLUMNS: ColumnDef<Parameter, any>[] = [
  columnHelper.accessor('name', { header: 'Parameter' }),
  columnHelper.accessor('description', { header: 'Description' }),
  columnHelper.accessor('baselinePoints', { header: 'Baseline Points' }),
  columnHelper.display({ id: 'weightage', header: 'Weightage (0–5)' }),
  columnHelper.display({ id: 'contribution', header: 'Contribution' }),
];

export default function AssessmentTable({ assessmentId }: { assessmentId: string }) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  /* Subscribe to the set of assessed parameter ids ONLY while an
     assessed/pending filter is active; otherwise stay unsubscribed so
     weightage edits don't re-render the whole table. */
  const assessedKey = useAssessmentStore((s) => {
    if (filterMode === 'all') return '';
    const a = s.assessments.find((x) => x.id === assessmentId);
    return a ? Object.keys(a.weightages).sort().join('|') : '';
  });

  const table = useReactTable({
    data: ALL_PARAMETERS,
    columns: COLUMNS,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = String(filterValue).toLowerCase();
      return (
        row.original.name.toLowerCase().includes(q) ||
        row.original.description.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleParams = useMemo(() => {
    const assessedIds = new Set(assessedKey ? assessedKey.split('|') : []);
    return table
      .getRowModel()
      .rows.map((r) => r.original)
      .filter((p) => {
        if (filterMode === 'assessed' && !assessedIds.has(p.id)) return false;
        if (filterMode === 'pending' && assessedIds.has(p.id)) return false;
        if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
        return true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterMode, categoryFilter, assessedKey]);

  const paramsByCategory = useMemo(() => {
    const map = new Map<string, Parameter[]>();
    for (const p of visibleParams) {
      const arr = map.get(p.categoryId) ?? [];
      arr.push(p);
      map.set(p.categoryId, arr);
    }
    return map;
  }, [visibleParams]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }} className="no-print">
        <TextField
          size="small"
          placeholder="Search parameters…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, flex: 1, maxWidth: 420, bgcolor: 'background.paper' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Select
          native
          size="small"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as string)}
          sx={{ minWidth: 220, bgcolor: 'background.paper', fontWeight: 600 }}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}. {c.name}
            </option>
          ))}
        </Select>
        <Select
          native
          size="small"
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
          sx={{ minWidth: 160, bgcolor: 'background.paper', fontWeight: 600 }}
        >
          <option value="all">All Parameters</option>
          <option value="assessed">Assessed</option>
          <option value="pending">Pending</option>
        </Select>
      </Box>

      <TableContainer
        component={Paper}
        sx={{ maxHeight: 'calc(100vh - 300px)', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
      >
        <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h, i) => (
                  <TableCell
                    key={h.id}
                    align={i >= 2 ? 'center' : 'left'}
                    sx={{ width: i === 0 ? '22%' : i === 1 ? '36%' : '14%' }}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {CATEGORIES.map((cat) => {
              const params = paramsByCategory.get(cat.id);
              if (!params || params.length === 0) return null;
              const isCollapsed = collapsed[cat.id] ?? false;
              return (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  assessmentId={assessmentId}
                  isCollapsed={isCollapsed}
                  onToggle={() =>
                    setCollapsed((c) => ({ ...c, [cat.id]: !isCollapsed }))
                  }
                  params={params}
                />
              );
            })}
            {visibleParams.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    No parameters match your search or filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function CategorySection({
  category,
  assessmentId,
  isCollapsed,
  onToggle,
  params,
}: {
  category: Category;
  assessmentId: string;
  isCollapsed: boolean;
  onToggle: () => void;
  params: Parameter[];
}) {
  return (
    <>
      <CategoryHeaderRow
        category={category}
        assessmentId={assessmentId}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
      />
      {!isCollapsed &&
        params.map((p) => (
          <ParamRow key={p.id} param={p} assessmentId={assessmentId} />
        ))}
    </>
  );
}

/* Re-renders only when this category's score/assessed-count changes. */
function CategoryHeaderRow({
  category,
  assessmentId,
  isCollapsed,
  onToggle,
}: {
  category: Category;
  assessmentId: string;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const catScore = useAssessmentStore((s) => {
    const a = s.assessments.find((x) => x.id === assessmentId);
    if (!a) return 0;
    let sum = 0;
    for (const p of category.parameters) {
      const w = a.weightages[p.id];
      if (w !== undefined) sum += p.baselinePoints * w;
    }
    return sum;
  });
  const assessed = useAssessmentStore((s) => {
    const a = s.assessments.find((x) => x.id === assessmentId);
    if (!a) return 0;
    return category.parameters.filter((p) => a.weightages[p.id] !== undefined).length;
  });

  return (
    <TableRow
      hover
      onClick={onToggle}
      sx={(t) => ({
        cursor: 'pointer',
        bgcolor: t.palette.mode === 'light' ? '#eef1fb' : 'rgba(99,102,241,0.08)',
        '& td': { borderBottom: `2px solid ${t.palette.divider}` },
      })}
    >
      <TableCell colSpan={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
          <Typography variant="subtitle2" color="primary" noWrap sx={{ fontWeight: 700 }}>
            {category.id}. {category.name}
          </Typography>
          <Chip
            size="small"
            label={`${assessed}/${category.parameters.length}`}
            color={assessed === category.parameters.length ? 'success' : 'default'}
            variant={assessed === category.parameters.length ? 'filled' : 'outlined'}
          />
        </Box>
      </TableCell>
      <TableCell align="center">
        <Typography variant="caption" color="text.secondary">
          Category Score
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Typography variant="subtitle2" color="primary.dark">
          {formatNumber(catScore)}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

/* Memoized row that subscribes to its own weightage only. */
const ParamRow = memo(function ParamRow({
  param,
  assessmentId,
}: {
  param: Parameter;
  assessmentId: string;
}) {
  const weightage = useAssessmentStore(
    (s) => s.assessments.find((x) => x.id === assessmentId)?.weightages[param.id],
  );
  const setWeightage = useAssessmentStore((s) => s.setWeightage);
  const contribution = weightage === undefined ? undefined : param.baselinePoints * weightage;

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {param.name}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {param.description}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Tooltip title="Baseline Complexity Points are fixed (read-only)">
          <Chip
            size="small"
            icon={<LockIcon sx={{ fontSize: 13 }} />}
            label={param.baselinePoints}
            sx={{ fontWeight: 700, bgcolor: 'action.selected' }}
          />
        </Tooltip>
      </TableCell>
      <TableCell align="center">
        {/* Native select: opens the OS dropdown, which can't "click through"
            and select an option just from opening (MUI menu bug on open). */}
        <Select
          native
          size="small"
          value={weightage === undefined ? '' : String(weightage)}
          onChange={(e) => {
            const v = e.target.value as string;
            setWeightage(assessmentId, param.id, v === '' ? null : Number(v));
          }}
          sx={{ minWidth: 96, borderRadius: 2, fontWeight: 600 }}
        >
          <option value="">—</option>
          {WEIGHTAGE_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </Select>
      </TableCell>
      <TableCell align="center">
        <Typography
          variant="body2"
          sx={{ fontWeight: 700 }}
          color={contribution ? 'primary.main' : 'text.disabled'}
        >
          {contribution === undefined ? '—' : formatNumber(contribution)}
        </Typography>
      </TableCell>
    </TableRow>
  );
});
