import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface PlaceholderPageProps {
  messageKey: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ messageKey }) => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" color="text.secondary">
          {t(messageKey)}
        </Typography>
      </Box>
    </Container>
  );
};

export default PlaceholderPage;
