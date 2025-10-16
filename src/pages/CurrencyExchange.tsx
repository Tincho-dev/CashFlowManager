import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { ArrowRightLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Account } from '../types';
import { Currency } from '../types';
import { CurrencyExchangeService } from '../services/CurrencyExchangeService';

const CurrencyExchange: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState<number>(0);
  const [toAccountId, setToAccountId] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [isFromAmount, setIsFromAmount] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  const [commission, setCommission] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exchangeService, setExchangeService] = useState<CurrencyExchangeService | null>(null);

  useEffect(() => {
    if (isInitialized && accountService) {
      if (!exchangeService) {
        setExchangeService(new CurrencyExchangeService());
      }
      loadAccounts();
    }
  }, [isInitialized, accountService, exchangeService]);

  useEffect(() => {
    if (fromAccountId && toAccountId && amount) {
      calculateExchange();
    } else {
      setCalculatedAmount(null);
      setExchangeRate(null);
      setCommission(0);
    }
  }, [fromAccountId, toAccountId, amount, isFromAmount]);

  const loadAccounts = () => {
    if (!accountService) return;
    const allAccounts = accountService.getAllAccounts();
    setAccounts(allAccounts);
    
    // Set default accounts (first USD and first ARS if available)
    const usdAccount = allAccounts.find(a => a.currency === Currency.USD);
    const arsAccount = allAccounts.find(a => a.currency === Currency.ARS);
    
    if (usdAccount) setFromAccountId(usdAccount.id);
    if (arsAccount && usdAccount?.id !== arsAccount.id) setToAccountId(arsAccount.id);
  };

  const calculateExchange = async () => {
    if (!fromAccountId || !toAccountId || !amount || !exchangeService) return;

    setLoading(true);
    setError(null);

    try {
      const result = await exchangeService.calculateExchange({
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        isFromAmount,
      });

      if (result) {
        setExchangeRate(result.exchangeRate);
        setCommission(result.commission);
        setCalculatedAmount(isFromAmount ? result.toAmount : result.fromAmount);
      } else {
        setError('Unable to calculate exchange. Please check your inputs.');
      }
    } catch (err) {
      setError('Error calculating exchange: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSwapAccounts = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || !amount || !exchangeService) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fromAccount = accounts.find(a => a.id === fromAccountId);
      const toAccount = accounts.find(a => a.id === toAccountId);

      if (!fromAccount || !toAccount) {
        setError('Invalid accounts selected');
        return;
      }

      const result = await exchangeService.createExchange({
        fromAccountId,
        toAccountId,
        fromAmount: isFromAmount ? parseFloat(amount) : undefined,
        toAmount: !isFromAmount ? parseFloat(amount) : undefined,
        fromCurrency: fromAccount.currency,
        toCurrency: toAccount.currency,
        exchangeRate: exchangeRate || undefined,
        commission,
        date: new Date().toISOString().split('T')[0],
      });

      if (result) {
        setSuccess('Currency exchange completed successfully!');
        setAmount('');
        setCalculatedAmount(null);
        setExchangeRate(null);
        setCommission(0);
        loadAccounts(); // Reload to update balances
      } else {
        setError('Failed to complete currency exchange');
      }
    } catch (err) {
      setError('Error completing exchange: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Currency Exchange
      </Typography>

      {accounts.length < 2 ? (
        <Alert severity="warning">
          You need at least 2 accounts with different currencies to perform currency exchanges.
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    From Account
                  </Typography>
                  <TextField
                    select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(parseInt(e.target.value))}
                    fullWidth
                    required
                  >
                    {accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name} ({account.currency}) - Balance: {account.balance.toFixed(2)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Button
                    onClick={handleSwapAccounts}
                    disabled={!fromAccountId || !toAccountId}
                    sx={{ minWidth: 'auto' }}
                  >
                    <ArrowRightLeft size={24} />
                  </Button>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    To Account
                  </Typography>
                  <TextField
                    select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(parseInt(e.target.value))}
                    fullWidth
                    required
                  >
                    {accounts
                      .filter(a => a.id !== fromAccountId)
                      .map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.name} ({account.currency}) - Balance: {account.balance.toFixed(2)}
                        </MenuItem>
                      ))}
                  </TextField>
                </Box>

                <Divider />

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ flex: 1 }}>
                      {isFromAmount ? 'Amount to Exchange' : 'Amount to Receive'}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setIsFromAmount(!isFromAmount)}
                      variant="outlined"
                    >
                      Switch
                    </Button>
                  </Box>
                  <TextField
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    fullWidth
                    required
                    inputProps={{ step: '0.01', min: '0' }}
                    placeholder={`Enter amount in ${isFromAmount ? fromAccount?.currency : toAccount?.currency}`}
                  />
                </Box>

                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                )}

                {exchangeRate !== null && calculatedAmount !== null && (
                  <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Exchange Rate:</strong> 1 {fromAccount?.currency} = {exchangeRate.toFixed(4)} {toAccount?.currency}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Commission:</strong> {commission.toFixed(2)} {fromAccount?.currency}
                      {fromAccount?.commissionRate ? ` (${fromAccount.commissionRate}%)` : ''}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {isFromAmount ? (
                        <>You will receive: {calculatedAmount.toFixed(2)} {toAccount?.currency}</>
                      ) : (
                        <>You will pay: {calculatedAmount.toFixed(2)} {fromAccount?.currency}</>
                      )}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      setAmount('');
                      setCalculatedAmount(null);
                      setExchangeRate(null);
                      setCommission(0);
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading || !amount || !calculatedAmount}
                  >
                    Exchange Currency
                  </Button>
                </Box>
              </Box>
            </form>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default CurrencyExchange;
