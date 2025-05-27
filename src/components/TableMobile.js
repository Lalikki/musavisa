import { Box, Button, ButtonGroup, Card, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { format } from 'date-fns'; // For formatting dates

export default function TableMobile({ headers, rows, data, actions }) {
  const formatDate = dateString => {
    return dateString ? format(dateString, 'dd.MM.yyyy') : 'N/A';
  };
  return (
    <Card variant="outlined" sx={{ overflowX: 'auto', mt: 2 }}>
      <Table aria-label="simple table" sx={{ width: '100%' }}>
        {headers.map((header, index) => (
          <TableRow key={index}>
            <TableCell variant="head">{header}</TableCell>
            <TableCell>{(rows[index] === 'createdAt' && formatDate(data[rows[index]])) || data[rows[index]]}</TableCell>
          </TableRow>
        ))}
      </Table>
      <Box sx={{ m: 1 }}>{actions(data)}</Box>
    </Card>
  );
}
