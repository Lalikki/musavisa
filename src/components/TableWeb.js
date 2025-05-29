import { TableContainer, TableHead, Table, TableBody, TableCell, TableRow, Paper, Typography } from '@mui/material';

export default function TableWeb({ headers, rows, data, actions }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="My Quizzes Table" variant="outlined">
        <TableHead>
          <TableRow>
            {headers.map((header, index) => (
              <TableCell key={index} align={header.align || 'left'}>
                {header.value}
              </TableCell>
            ))}
            {actions && <TableCell></TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((d, dataIndex) => (
            <TableRow key={dataIndex}>
              {rows[dataIndex].map((row, rowIndex) => (
                <TableCell key={rowIndex} align={row.align || 'left'}>
                  {row.value || 'N/A'}
                  {row.subValue && (
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                      {row.subValue}
                    </Typography>
                  )}
                </TableCell>
              ))}
              {actions && <TableCell>{actions(d)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
