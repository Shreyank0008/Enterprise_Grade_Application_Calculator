import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import FolderZipRoundedIcon from '@mui/icons-material/DriveFolderUploadRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import { ToggleButton, ToggleButtonGroup, TextField } from '@mui/material';
import { readFolder } from '../scanner/readFolder';
import { fetchRepoEntries } from '../scanner/readRepo';
import { collectSignals } from '../scanner/signals';
import { buildProposals, type Proposal } from '../scanner/rules';
import { TOTAL_PARAMETERS } from '../data/parameters';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { WEIGHTAGE_OPTIONS } from '../utils/calc';

type Phase = 'pick' | 'scanning' | 'review';

export default function ScanDialog({
  assessmentId,
  open,
  onClose,
}: {
  assessmentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const applyWeightages = useAssessmentStore((s) => s.applyWeightages);
  const [phase, setPhase] = useState<Phase>('pick');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState('');
  const [source, setSource] = useState<'folder' | 'repo'>('folder');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoToken, setRepoToken] = useState('');
  const [statusText, setStatusText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const includedCount = useMemo(
    () => proposals.filter((p) => included[p.parameterId]).length,
    [proposals, included],
  );

  const reset = () => {
    setPhase('pick');
    setProgress(0);
    setError('');
    setProposals([]);
    setIncluded({});
  };

  const analyze = (entries: Parameters<typeof collectSignals>[0], label: string) => {
    setStatusText('Analyzing code…');
    const scan = collectSignals(entries);
    const props = buildProposals(scan);
    setProposals(props);
    setIncluded(Object.fromEntries(props.map((p) => [p.parameterId, true])));
    const lang = scan.languages[0]?.name ?? 'unknown';
    setSummary(
      `${label} · ${scan.signals.fileCount.toLocaleString()} files · ${scan.signals.totalLoc.toLocaleString()} LOC · primary language ${lang}`,
    );
    setPhase('review');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhase('scanning');
    setError('');
    setStatusText('Reading files…');
    try {
      const entries = await readFolder(files, (done, total) =>
        setProgress(total > 0 ? Math.round((done / total) * 100) : 0),
      );
      analyze(entries, 'Local folder');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
      setPhase('pick');
    }
  };

  const handleRepo = async () => {
    if (!repoUrl.trim()) return;
    setPhase('scanning');
    setError('');
    setProgress(-1); // indeterminate
    try {
      const { entries, label } = await fetchRepoEntries(
        repoUrl,
        repoToken || undefined,
        setStatusText,
      );
      analyze(entries, label);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Repository scan failed');
      setPhase('pick');
    } finally {
      setProgress(0);
    }
  };

  const apply = () => {
    applyWeightages(
      assessmentId,
      proposals
        .filter((p) => included[p.parameterId])
        .map((p) => ({ parameterId: p.parameterId, weightage: p.weightage })),
    );
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Auto-Fill Weightages from Code
        {phase === 'review' && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {summary}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {phase === 'pick' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{error}</Alert>}
            <ToggleButtonGroup
              exclusive
              size="small"
              value={source}
              onChange={(_e, v) => v && setSource(v)}
              sx={{ mb: 3 }}
            >
              <ToggleButton value="folder" sx={{ px: 2.5 }}>
                <FolderZipRoundedIcon sx={{ fontSize: 18, mr: 1 }} /> Local Folder
              </ToggleButton>
              <ToggleButton value="repo" sx={{ px: 2.5 }}>
                <GitHubIcon sx={{ fontSize: 18, mr: 1 }} /> GitHub Repo
              </ToggleButton>
            </ToggleButtonGroup>

            {source === 'folder' ? (
              <Box>
                <FolderZipRoundedIcon sx={{ fontSize: 52, color: 'primary.main' }} />
                <Typography sx={{ mt: 1, fontWeight: 600 }}>
                  Select your project folder
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 460, mx: 'auto' }}>
                  The folder is analyzed locally in your browser — no files are uploaded
                  anywhere. Detected metrics are mapped to weightages (0–5) that you
                  review before anything is applied.
                </Typography>
                <Button variant="contained" onClick={() => inputRef.current?.click()}>
                  Choose Folder…
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  /* non-standard but supported by all Chromium/Firefox/Safari */
                  {...({ webkitdirectory: '', directory: '' } as object)}
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </Box>
            ) : (
              <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'left' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The repository is downloaded straight from GitHub into your browser
                  and analyzed there — it never touches this app's server. Public
                  repos need no token; for private repos add a fine-grained personal
                  access token with read-only content access (used once, never stored).
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Repository URL"
                  placeholder="https://github.com/owner/repo or owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRepo()}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  label="GitHub token (optional — private repos / rate limits)"
                  value={repoToken}
                  onChange={(e) => setRepoToken(e.target.value)}
                  sx={{ mb: 2.5 }}
                />
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<GitHubIcon />}
                    disabled={!repoUrl.trim()}
                    onClick={handleRepo}
                  >
                    Fetch &amp; Scan Repository
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {phase === 'scanning' && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ mb: 2, fontWeight: 600 }}>
              {statusText || 'Working…'}{progress > 0 ? ` ${progress}%` : ''}
            </Typography>
            <LinearProgress
              variant={progress > 0 ? 'determinate' : 'indeterminate'}
              value={progress > 0 ? progress : undefined}
              sx={{ height: 8, maxWidth: 420, mx: 'auto' }}
            />
          </Box>
        )}

        {phase === 'review' && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {proposals.length} of {TOTAL_PARAMETERS} parameters scored automatically.
              The rest (business, delivery and migration context) need manual judgment.
              Adjust any value below before applying.
            </Alert>
            <TableContainer sx={{ maxHeight: 420, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={includedCount === proposals.length}
                        indeterminate={includedCount > 0 && includedCount < proposals.length}
                        onChange={(e) =>
                          setIncluded(Object.fromEntries(proposals.map((p) => [p.parameterId, e.target.checked])))
                        }
                        sx={{ color: '#c7d2fe', '&.Mui-checked': { color: '#c7d2fe' } }}
                      />
                    </TableCell>
                    <TableCell>Parameter</TableCell>
                    <TableCell>Evidence</TableCell>
                    <TableCell align="center">Weightage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposals.map((p) => (
                    <TableRow key={p.parameterId} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={included[p.parameterId] ?? false}
                          onChange={(e) =>
                            setIncluded((m) => ({ ...m, [p.parameterId]: e.target.checked }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip size="small" label={p.parameterId} sx={{ fontFamily: 'monospace' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {p.parameterName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {p.evidence}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Select
                          native
                          size="small"
                          value={String(p.weightage)}
                          onChange={(e) =>
                            setProposals((list) =>
                              list.map((x) =>
                                x.parameterId === p.parameterId
                                  ? { ...x, weightage: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        >
                          {WEIGHTAGE_OPTIONS.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        {phase === 'review' && (
          <>
            <Button onClick={reset}>Scan Different Folder</Button>
            <Button variant="contained" onClick={apply} disabled={includedCount === 0}>
              Apply {includedCount} Weightages
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
