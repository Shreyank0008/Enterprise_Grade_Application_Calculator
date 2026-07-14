import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import GradeRoundedIcon from '@mui/icons-material/GradeRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TOTAL_PARAMETERS } from '../data/parameters';
import type { Assessment } from '../types';
import {
  CATEGORY_COLORS,
  assessedCount,
  categorySummaries,
  classify,
  completionPct,
  formatNumber,
  topContributors,
  totalScore,
} from '../utils/calc';
import { BRAND_GRADIENT, CHART_PRIMARY } from '../theme';

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#3b82f6', '#a855f7',
  '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#818cf8', '#2dd4bf',
  '#c084fc', '#facc15', '#38bdf8', '#4ade80',
];

export default function Dashboard({ assessment }: { assessment: Assessment }) {
  const theme = useTheme();
  const score = totalScore(assessment.weightages);
  const category = classify(score);
  const assessed = assessedCount(assessment.weightages);
  const pct = completionPct(assessment.weightages);

  const summaries = useMemo(
    () => categorySummaries(assessment.weightages),
    [assessment.weightages],
  );
  const top = useMemo(
    () => topContributors(assessment.weightages, 10),
    [assessment.weightages],
  );

  const pieData = summaries
    .filter((s) => s.score > 0)
    .map((s) => ({ name: `${s.categoryId}. ${s.categoryName}`, value: s.score }));

  const radarData = summaries.map((s) => ({ category: s.categoryId, score: s.score }));
  const barData = summaries.map((s) => ({ name: s.categoryId, fullName: s.categoryName, score: s.score }));

  const tickColor = theme.palette.text.secondary;
  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    color: theme.palette.text.primary,
    fontSize: 12,
  } as const;

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {/* KPI cards */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
        }}
      >
        <Card sx={{ background: BRAND_GRADIENT, color: '#fff', border: 'none' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GradeRoundedIcon sx={{ fontSize: 18, opacity: 0.85 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.85 }}>
                TOTAL COMPLEXITY SCORE
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {formatNumber(score)}
            </Typography>
          </CardContent>
        </Card>
        <KpiCard
          icon={<CategoryRoundedIcon sx={{ fontSize: 18 }} />}
          label="Project Category"
          value={
            <Chip
              label={category}
              sx={{ bgcolor: CATEGORY_COLORS[category], color: '#fff', fontWeight: 700, fontSize: 14 }}
            />
          }
        />
        <KpiCard
          icon={<ListAltRoundedIcon sx={{ fontSize: 18 }} />}
          label="Total Parameters"
          value={formatNumber(TOTAL_PARAMETERS)}
        />
        <KpiCard
          icon={<TaskAltRoundedIcon sx={{ fontSize: 18 }} />}
          label="Parameters Assessed"
          value={formatNumber(assessed)}
        />
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              COMPLETION
            </Typography>
            <Typography variant="h4" sx={{ my: 0.5 }}>
              {pct}%
            </Typography>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 8 }} />
          </CardContent>
        </Card>
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <ChartCard title="Complexity Share by Category">
          {pieData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={72}
                  outerRadius={112}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(v) => formatNumber(Number(v))} contentStyle={tooltipStyle} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11, maxWidth: 220, overflow: 'hidden', color: tickColor }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Category Profile">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} outerRadius={110}>
              <PolarGrid stroke={theme.palette.divider} />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: tickColor }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: tickColor }} stroke={theme.palette.divider} />
              <Radar
                name="Score"
                dataKey="score"
                stroke={CHART_PRIMARY}
                fill={CHART_PRIMARY}
                fillOpacity={0.4}
              />
              <RechartsTooltip formatter={(v) => formatNumber(Number(v))} contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      <ChartCard title="Complexity by Category">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} stroke={theme.palette.divider} />
            <YAxis
              tick={{ fontSize: 11, fill: tickColor }}
              stroke={theme.palette.divider}
              tickFormatter={(v) => formatNumber(Number(v))}
            />
            <RechartsTooltip
              formatter={(v) => formatNumber(Number(v))}
              contentStyle={tooltipStyle}
              cursor={{ fill: theme.palette.action.hover }}
              labelFormatter={(label) => {
                const item = barData.find((b) => b.name === label);
                return item ? `${item.name}. ${item.fullName}` : String(label);
              }}
            />
            <Bar dataKey="score" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={38} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top contributors */}
      <ChartCard title="Top Contributors">
        {top.length === 0 ? (
          <EmptyChart message="Set weightages in the Assessment tab to see top contributors." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Parameter</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Baseline</TableCell>
                <TableCell align="right">Weightage</TableCell>
                <TableCell align="right">Contribution</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {top.map((t, i) => (
                <TableRow key={t.parameter.id} hover>
                  <TableCell>
                    <Chip size="small" label={i + 1} sx={{ minWidth: 32 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t.parameter.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{t.parameter.categoryId}</TableCell>
                  <TableCell align="right">{t.parameter.baselinePoints}</TableCell>
                  <TableCell align="right">{t.weightage}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 700 }} color="primary.main">
                      {formatNumber(t.contribution)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ChartCard>
    </Box>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          {icon}
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {label.toUpperCase()}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ mt: 1 }} component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: 'block', fontWeight: 700, letterSpacing: '0.08em' }}
        >
          {title.toUpperCase()}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message = 'No data yet — assess parameters to populate this chart.' }: { message?: string }) {
  return (
    <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}
