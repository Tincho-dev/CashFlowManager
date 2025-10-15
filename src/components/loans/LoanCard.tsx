import React from 'react';
import { Card, CardContent, Typography, IconButton, Box, Chip, LinearProgress } from '@mui/material';
import { Edit, Trash2, DollarSign } from 'lucide-react';
import type { Loan } from '../../types';
import { useTranslation } from 'react-i18next';

interface LoanCardProps {
  loan: Loan;
  onEdit: (loan: Loan) => void;
  onDelete: (id: number) => void;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const percentagePaid = loan.principal > 0 ? ((loan.principal - loan.balance) / loan.principal) * 100 : 0;

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
            {loan.lender}
          </Typography>
          <Box>
            <IconButton 
              size="small" 
              onClick={() => onEdit(loan)}
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
              onClick={() => onDelete(loan.id)}
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
        <Chip 
          label={loan.type.replace('_', ' ')} 
          size="small" 
          sx={{ mb: 2 }}
        />
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Principal: {loan.currency} ${loan.principal.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {percentagePaid.toFixed(0)}% paid
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={percentagePaid} 
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>
          Balance: {loan.currency} ${loan.balance.toFixed(2)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <DollarSign size={16} />
          <Typography variant="body2">
            {loan.currency} ${loan.monthlyPayment.toFixed(2)}/month
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {loan.interestRate.toFixed(2)}% interest
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Due: {new Date(loan.endDate).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default LoanCard;
