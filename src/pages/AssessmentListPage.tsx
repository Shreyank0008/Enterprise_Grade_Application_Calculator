import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { TOTAL_PARAMETERS, CATEGORIES } from '../data/parameters';
import {
  CATEGORY_COLORS,
  classify,
  completionPct,
  formatNumber,
  totalScore,
} from '../utils/calc';
import { BRAND_GRADIENT } from '../theme';

interface FormValues {
  name: string;
  projectName: string;
  assessor: string;
  notes: string;
}

export default function AssessmentListPage() {
  const navigate = useNavigate();
  const assessments = useAssessmentStore((s) => s.assessments);
  const createAssessment = useAssessmentStore((s) => s.createAssessment);
  const deleteAssessment = useAssessmentStore((s) => s.deleteAssessment);

  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', projectName: '', assessor: '', notes: '' },
  });

  const onSubmit = (values: FormValues) => {
    const id = createAssessment(values);
    reset();
    setOpen(false);
    navigate(`/assessment/${id}`);
  };

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              background: BRAND_GRADIENT,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              width: 'fit-content',
            }}
          >
            Assessments
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Score project complexity across{' '}
            <b>{CATEGORIES.length} categories</b> and <b>{TOTAL_PARAMETERS} parameters</b>,
            with automatic classification.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          onClick={() => setOpen(true)}
          sx={{ px: 3, py: 1.2 }}
        >
          New Assessment
        </Button>
      </Box>

      {assessments.length === 0 ? (
        <Card sx={{ py: 10, textAlign: 'center' }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              mx: 'auto',
              mb: 2,
              borderRadius: 4,
              display: 'grid',
              placeItems: 'center',
              background: BRAND_GRADIENT,
              color: '#fff',
              boxShadow: '0 16px 40px -12px rgba(99,102,241,0.6)',
            }}
          >
            <AssessmentRoundedIcon fontSize="large" />
          </Box>
          <Typography variant="h6">No assessments yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 0.5 }}>
            Create your first assessment to start scoring project complexity.
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
            Create Assessment
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
          }}
        >
          {assessments.map((a) => {
            const score = totalScore(a.weightages);
            const category = classify(score);
            const pct = completionPct(a.weightages);
            const accent = CATEGORY_COLORS[category];
            return (
              <Card
                key={a.id}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: '0 18px 40px -16px rgba(15,23,42,0.28)',
                    transform: 'translateY(-3px)',
                  },
                }}
              >
                <Box sx={{ height: 5, background: `linear-gradient(90deg, ${accent}, transparent 140%)` }} />
                <CardActionArea onClick={() => navigate(`/assessment/${a.id}`)}>
                  <CardContent sx={{ pb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          bgcolor: `${accent}22`,
                          color: accent,
                        }}
                      >
                        <FolderOpenRoundedIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0, pr: 4 }}>
                        <Typography variant="h6" noWrap>
                          {a.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {a.projectName || 'Untitled project'}
                          {a.assessor ? ` · ${a.assessor}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, my: 1.5, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={category}
                        sx={{ bgcolor: accent, color: '#fff' }}
                      />
                      <Chip size="small" variant="outlined" label={`Score ${formatNumber(score)}`} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ flex: 1, height: 7 }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {pct}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                      Updated {new Date(a.updatedAt).toLocaleString()}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <Tooltip title="Delete assessment">
                  <IconButton
                    size="small"
                    onClick={() => setConfirmDelete(a.id)}
                    sx={{ position: 'absolute', top: 14, right: 10 }}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Create dialog (React Hook Form) */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ fontWeight: 800 }}>Create Assessment</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
            <TextField
              label="Assessment Name"
              autoFocus
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name', { required: 'Assessment name is required' })}
            />
            <TextField label="Project Name" fullWidth {...register('projectName')} />
            <TextField label="Assessor" fullWidth {...register('assessor')} />
            <TextField label="Notes" fullWidth multiline rows={3} {...register('notes')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete this assessment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This permanently removes the assessment and its weightages from local storage.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmDelete) deleteAssessment(confirmDelete);
              setConfirmDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
