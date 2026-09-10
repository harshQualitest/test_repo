import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

/**
 * Props for {@link TaskDashboardHeader}.
 * @property selectedTaskId - The currently selected task's id, controls the `Select` value.
 * @property onTaskChange - Callback invoked with the newly selected task id when the user changes the selection.
 * @property taskOptions - Available task ids to populate the dropdown; defaults to an empty list.
 */
interface TaskDashboardHeaderProps {
  selectedTaskId: string;
  onTaskChange: (taskId: string) => void;
  taskOptions?: string[];
}

/**
 * Component: TaskDashboardHeader
 *
 * Purpose: Page header for the Task KPIs Dashboard — displays the page title/subtitle
 * and a task-picker dropdown that lets the user switch which task's KPIs are shown.
 *
 * Responsibilities:
 * - Render the dashboard title and descriptive subtitle.
 * - Render a controlled MUI `Select` bound to `selectedTaskId`, populated from `taskOptions`.
 * - Notify the parent via `onTaskChange` whenever the user picks a different task.
 *
 * Props:
 * - selectedTaskId: string - currently selected task id (controlled value).
 * - onTaskChange: (taskId: string) => void - change handler fired on selection.
 * - taskOptions?: string[] - list of task ids available in the dropdown (default `[]`).
 *
 * Major child components rendered: MUI `Box`, `Typography`, `FormControl`, `Select`, `MenuItem`, `InputLabel`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const TaskDashboardHeader = ({
  selectedTaskId,
  onTaskChange,
  taskOptions = [],
}: TaskDashboardHeaderProps) => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Task KPIs Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Detailed metrics and analytics for individual task performance
        </Typography>
      </Box>

      <FormControl variant="outlined" size="small" sx={{ width: 200 }}>
        <InputLabel id="task-select-label">Task</InputLabel>
        <Select
          labelId="task-select-label"
          value={selectedTaskId}
          label="Task"
          // Coerce the MUI Select event value to string before handing it back to the parent
          onChange={(e) => onTaskChange(String(e.target.value))}
          IconComponent={(_props) => <ExpandMoreIcon sx={{ width: 16, height: 16, opacity: 0.6 }} />}
          sx={{ backgroundColor: 'background.paper' }}
        >
          {taskOptions.map((taskId) => (
            <MenuItem key={taskId} value={taskId}>
              {taskId}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
