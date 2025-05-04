import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function EmptyState({ icon, title, description, actionText, actionLink }) {
  const navigate = useNavigate();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8
      }}
    >
      <Box sx={{ color: 'grey.500', mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
        {description}
      </Typography>
      {actionText && actionLink && (
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate(actionLink)}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
}

export default EmptyState;