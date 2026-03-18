import { Card, CardContent, Typography, Button, Stack, Box } from '@mui/material';

export default function QuizCard() {
  return (
    <Card sx={{ maxWidth: 400, mt: 5, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Question 1 of 10
        </Typography>
        
        <Typography variant="h5" component="div" sx={{ mb: 2, fontWeight: 'bold' }}>
          Which language is React written in?
        </Typography>

        <Stack spacing={1}>
          <Button variant="outlined" fullWidth color="primary">
            Java
          </Button>
          <Button variant="contained" fullWidth color="primary">
            JavaScript / TypeScript
          </Button>
          <Button variant="outlined" fullWidth color="primary">
            C++
          </Button>
        </Stack>
      </CardContent>
      
      <Box sx={{ p: 2, textAlign: 'right', borderTop: '1px solid #eee' }}>
        <Button size="small" color="secondary">Skip Question</Button>
      </Box>
    </Card>
  );
}