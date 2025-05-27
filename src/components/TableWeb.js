import { TableContainer, TableHead, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';
import React, { useState, useEffect } from 'react';

import { format } from 'date-fns'; // For formatting dates

export default function TableWeb({ headers, rows, data, actions }) {
  const formatDate = dateString => {
    return dateString ? format(dateString, 'dd.MM.yyyy') : 'N/A';
  };
  return (
    <TableContainer component={Paper}>
      <Table aria-label="My Quizzes Table">
        <TableHead>
          <TableRow>
            {headers.map((header, index) => (
              <TableCell key={index}>{header}</TableCell>
            ))}
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(d => (
            <TableRow>
              {rows.map(row => (
                <TableCell>{(row === 'createdAt' && formatDate(d[row])) || d[row]}</TableCell>
              ))}
              <TableCell>{actions(d)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
