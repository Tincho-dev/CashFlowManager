import React from 'react';
import { Card, CardContent, Typography, IconButton, Box } from '@mui/material';
import { Edit, Trash2 } from 'lucide-react';
import type { Account } from '../../types';
import { useTranslation } from 'react-i18next';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: number) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, onDelete }) => {
  const { t } = useTranslation();

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {account.name}
          </Typography>
          <Box>
            <IconButton 
              size="small" 
              onClick={() => onEdit(account)}
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
              onClick={() => onDelete(account.id)}
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {account.type}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {account.currency} ${account.balance.toFixed(2)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AccountCard;
