import React from 'react';
import { Card, CardContent, Typography, IconButton, Box } from '@mui/material';
import { Edit, Trash2, ArrowRight } from 'lucide-react';
import type { Transfer, Account } from '../../types';
import { useTranslation } from 'react-i18next';

interface TransferCardProps {
  transfer: Transfer;
  accounts: Account[];
  onEdit: (transfer: Transfer) => void;
  onDelete: (id: number) => void;
}

const TransferCard: React.FC<TransferCardProps> = ({ transfer, accounts, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const fromAccount = accounts.find(a => a.id === transfer.fromAccountId);
  const toAccount = accounts.find(a => a.id === transfer.toAccountId);

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        }
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {transfer.currency} ${transfer.amount.toFixed(2)}
          </Typography>
          <Box>
            <IconButton 
              size="small" 
              onClick={() => onEdit(transfer)}
              aria-label={t('common.edit')}
              sx={{ 
                '&:hover': { 
                  bgcolor: 'action.hover',
                }
              }}
            >
              <Edit size={18} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => onDelete(transfer.id)}
              aria-label={t('common.delete')}
              sx={{ 
                color: 'error.main',
                '&:hover': { 
                  bgcolor: 'error.lighter',
                }
              }}
            >
              <Trash2 size={18} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">From</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {fromAccount?.name || 'Unknown'}
            </Typography>
          </Box>
          <ArrowRight size={24} color="#666" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">To</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {toAccount?.name || 'Unknown'}
            </Typography>
          </Box>
        </Box>

        {transfer.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {transfer.description}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary">
          {new Date(transfer.date).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TransferCard;
