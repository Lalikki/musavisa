import { TableContainer, TableHead, Table, TableBody, TableCell, TableRow, Paper, Typography, useMediaQuery, Card, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles'; // Import useTheme

export default function CustomTable({ headers, rows, data, actions }) {
  const theme = useTheme(); // Get the theme object
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return isMobile ? (
    data.map((d, i) => (
      <Card key={i} variant="outlined" sx={{ overflowX: 'auto', mt: 2 }}>
        <Table aria-label="simple table" sx={{ width: '100%' }}>
          <TableBody>
            {headers.map((header, headerIndex) => (
              <TableRow key={headerIndex}>
                <TableCell variant="head">{header.value}</TableCell>
                <TableCell>
                  {rows[i][headerIndex].value || 'N/A'}
                  {rows[i][headerIndex].subValue && (
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                      {rows[i][headerIndex].subValue}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {actions && <Box sx={{ m: 1 }}>{actions(d)}</Box>}
      </Card>
    ))
  ) : (
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
