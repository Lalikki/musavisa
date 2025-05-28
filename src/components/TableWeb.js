import { TableContainer, TableHead, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export default function TableWeb({ headers, rows, data, actions }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="My Quizzes Table" variant="outlined">
        <TableHead>
          <TableRow>
            {headers.map((header, index) => (
              <TableCell key={index}>{header}</TableCell>
            ))}
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((d, dataIndex) => (
            <TableRow>
              {rows[dataIndex].map((row, rowIndex) => (
                <TableCell key={rowIndex}>{row}</TableCell>
              ))}
              {actions && (
                <TableCell>{actions(d)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
