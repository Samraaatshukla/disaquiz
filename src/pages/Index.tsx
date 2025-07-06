import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PaperSelection } from '@/components/papers/PaperSelection';
import { QuizInterface } from '@/components/quiz/QuizInterface';
import { ResultsView } from '@/components/results/ResultsView';

type AppState = 'papers' | 'quiz' | 'results';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>('papers');
  const [selectedPaper, setSelectedPaper] = useState<string>('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (!profile) {
    return <ProfileForm />;
  }

  const handleSelectPaper = (paperName: string) => {
    setSelectedPaper(paperName);
    setAppState('quiz');
  };

  const handleQuizSubmit = () => {
    setAppState('results');
  };

  const handleBackToPapers = () => {
    setAppState('papers');
    setSelectedPaper('');
  };

  const handleRetakeQuiz = () => {
    setAppState('quiz');
  };

  switch (appState) {
    case 'quiz':
      return (
        <QuizInterface
          paperName={selectedPaper}
          onSubmit={handleQuizSubmit}
          onBack={handleBackToPapers}
        />
      );
    case 'results':
      return (
        <ResultsView
          paperName={selectedPaper}
          onBack={handleBackToPapers}
          onRetakeQuiz={handleRetakeQuiz}
        />
      );
    default:
      return <PaperSelection onSelectPaper={handleSelectPaper} />;
  }
};

export default Index;
