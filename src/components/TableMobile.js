import { Box, Card, Table, TableBody, TableCell, TableRow } from '@mui/material';

export default function TableMobile({ headers, rows, data, actions }) {
  return (
    <Card variant="outlined" sx={{ overflowX: 'auto', mt: 2 }}>
      <Table aria-label="simple table" sx={{ width: '100%' }}>
        <TableBody>
          {headers.map((header, index) => (
            <TableRow key={index}>
              <TableCell variant="head">{header.value}</TableCell>
              <TableCell>{rows[index].value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {actions && <Box sx={{ m: 1 }}>{actions(data)}</Box>}
    </Card>
  );
}
