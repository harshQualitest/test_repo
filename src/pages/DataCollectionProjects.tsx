import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Chip,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import type { IDataCollectionProject } from '../interfaces/api/dataCollection.interface';

// NOTE: static empty array — this page currently renders with no data source wired
// up (no Redux/API call), so the table always shows the "no projects yet" empty state.
const projects: IDataCollectionProject[] = [];

/**
 * Component: DataCollectionProjects
 *
 * Purpose: Lists data-collection projects in a searchable table, with actions
 * to create a new project or drill into a project's uploads.
 *
 * Responsibilities:
 * - Filter the (currently static/empty) `projects` list by name search.
 * - Render a status chip (Expired/Active/Inactive) per project.
 * - Navigate to project creation or a project's uploads view.
 *
 * Props: none.
 *
 * State: `search` — the current search box text used to filter `projects` by name.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionProjects = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    // Case-insensitive substring match of the project name against the search box.
    const filtered = projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
    );

    /** Picks the status chip (Expired/Active/Inactive) to show for a given project row. */
    const getStatusChip = (project: IDataCollectionProject) => {
        if (project.is_expired) return <Chip label="Expired" color="error" size="small" />;
        if (project.status === 'active' || project.isactive === 1) return <Chip label="Active" color="success" size="small" />;
        return <Chip label="Inactive" size="small" />;
    };

    return (
        <Box py={3} px={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h5" fontWeight={700}>
                    Data Collection Projects
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/data-collection/create')}
                >
                    New Project
                </Button>
            </Box>

            <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search projects…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                                },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 8 }}>
                        <Typography variant="body2" color="text.secondary">
                            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {filtered.length === 0 ? (
                <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        {search ? 'No projects match your search.' : 'No data collection projects yet.'}
                    </Typography>
                    {!search && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            sx={{ mt: 2 }}
                            onClick={() => navigate('/data-collection/create')}
                        >
                            Create First Project
                        </Button>
                    )}
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="center">Target</TableCell>
                                <TableCell>Start</TableCell>
                                <TableCell>End</TableCell>
                                <TableCell>Phases</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((project) => (
                                <TableRow
                                key={project._id ?? project.name}
                                hover
                                sx={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/data-collection/uploads/${encodeURIComponent(project._id ?? project.name)}`)}
                            >
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {project.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {project.created_by}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={project.project_type} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell align="center">{project.target}</TableCell>
                                    <TableCell>{project.start_date ?? project.startDate}</TableCell>
                                    <TableCell>{project.end_date ?? project.endDate}</TableCell>
                                    <TableCell>
                                        {project.phases ? Object.keys(project.phases).length : 0}
                                    </TableCell>
                                    <TableCell>{getStatusChip(project)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default withPageErrorBoundary(DataCollectionProjects, 'Data Collection Projects');
