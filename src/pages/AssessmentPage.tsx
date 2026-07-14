import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Link,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsightsIcon from '@mui/icons-material/Insights';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ScanDialog from '../components/ScanDialog';
import AssessmentTable from '../components/AssessmentTable';
import Dashboard from '../components/Dashboard';
import { useAssessment } from '../store/useAssessmentStore';
import {
  CATEGORY_COLORS,
  classify,
  formatNumber,
  totalScore,
} from '../utils/calc';
import { exportToExcel } from '../utils/exportExcel';
import { exportToPdf } from '../utils/exportPdf';

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assessment = useAssessment(id);
  const [tab, setTab] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);

  if (!assessment) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Typography variant="h6" color="text.secondary">
          Assessment not found.
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/')}>
          Back to Assessments
        </Button>
      </Box>
    );
  }

  const score = totalScore(assessment.weightages);
  const category = classify(score);

  return (
    <Box>
      <Box className="no-print" sx={{ mb: 2 }}>
        <Breadcrumbs sx={{ mb: 1 }}>
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Assessments
          </Link>
          <Typography color="text.primary">{assessment.name}</Typography>
        </Breadcrumbs>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5">
              {assessment.name}
            </Typography>
            <Chip
              label={category}
              size="small"
              sx={{ bgcolor: CATEGORY_COLORS[category], color: '#fff', fontWeight: 700 }}
            />
            <Chip label={`Score: ${formatNumber(score)}`} size="small" />
            <Tooltip title="All changes are saved automatically to local storage">
              <Chip
                icon={<CloudDoneIcon />}
                label="Auto-saved"
                size="small"
                variant="outlined"
                color="success"
              />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AutoFixHighRoundedIcon />}
              onClick={() => setScanOpen(true)}
            >
              Auto-Fill from Code
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportToExcel(assessment)}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => exportToPdf(assessment)}
            >
              PDF
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </Box>
        </Box>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mt: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab icon={<TableChartIcon />} iconPosition="start" label="Assessment" />
          <Tab icon={<InsightsIcon />} iconPosition="start" label="Dashboard" />
        </Tabs>
      </Box>

      {tab === 0 && <AssessmentTable assessmentId={assessment.id} />}
      {tab === 1 && <Dashboard assessment={assessment} />}

      <ScanDialog
        assessmentId={assessment.id}
        open={scanOpen}
        onClose={() => setScanOpen(false)}
      />
    </Box>
  );
}
