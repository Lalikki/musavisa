import { Box, Button, ButtonGroup, Card, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

export default function TableMobile({ headers, rows, data, actions }) {
  return (
    <Card variant="outlined" sx={{ overflowX: 'auto', mt: 2 }}>
      <Table aria-label="simple table" sx={{ width: '100%' }}>
        <TableBody>
          {headers.map((header, index) => (
            <TableRow key={index}>
              <TableCell variant="head">{header}</TableCell>
              <TableCell>{rows[index]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {actions && <Box sx={{ m: 1 }}>{actions(data)}</Box>}
    </Card>
  );
}
