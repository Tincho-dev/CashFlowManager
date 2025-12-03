import React from 'react';
import { Card, CardContent, Typography, IconButton, Box, Chip, Tooltip } from '@mui/material';
import { Edit, Trash2, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import type { Investment } from '../../types';
import { useTranslation } from 'react-i18next';

interface InvestmentCardProps {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (id: number) => void;
  onTransfer?: (investment: Investment) => void;
}

const InvestmentCard: React.FC<InvestmentCardProps> = ({ investment, onEdit, onDelete, onTransfer }) => {
  const { t } = useTranslation();
  const gain = investment.currentValue - investment.amount;
  const percentage = investment.amount > 0 ? (gain / investment.amount) * 100 : 0;
  const isPositive = gain >= 0;

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
            {investment.name}
          </Typography>
          <Box>
            {onTransfer && (
              <Tooltip title="Transfer to another account">
                <IconButton 
                  size="small" 
                  onClick={() => onTransfer(investment)}
                  aria-label="Transfer"
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'action.hover',
                    }
                  }}
                >
                  <ArrowRightLeft size={18} />
                </IconButton>
              </Tooltip>
            )}
            <IconButton 
              size="small" 
              onClick={() => onEdit(investment)}
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
              onClick={() => onDelete(investment.id)}
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
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={investment.type} 
            size="small"
          />
          {investment.symbol && (
            <Chip 
              label={investment.symbol} 
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        {investment.quantity && investment.purchasePrice && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {investment.quantity.toFixed(2)} units @ {investment.currency} ${investment.purchasePrice.toFixed(2)}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Initial: {investment.currency} ${investment.amount.toFixed(2)}
          {investment.commission && investment.commission > 0 && (
            <span style={{ fontSize: '0.85em' }}> (+ {investment.commission.toFixed(2)} commission)</span>
          )}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
          {investment.currency} ${investment.currentValue.toFixed(2)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isPositive ? (
            <TrendingUp size={20} color="#4caf50" />
          ) : (
            <TrendingDown size={20} color="#f44336" />
          )}
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              color: isPositive ? 'success.main' : 'error.main'
            }}
          >
            {isPositive ? '+' : ''}{gain.toFixed(2)} ({percentage.toFixed(2)}%)
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Purchased: {new Date(investment.purchaseDate).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default InvestmentCard;
