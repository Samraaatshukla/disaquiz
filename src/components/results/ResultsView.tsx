import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { QuestionWithAnswer } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { Leaderboard } from './Leaderboard';

interface ResultsViewProps {
  paperName: string;
  onBack: () => void;
  onRetakeQuiz: () => void;
}

interface QuizResults {
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  scorePercentage: number;
  questions: QuestionWithAnswer[];
}

export const ResultsView = ({ paperName, onBack, onRetakeQuiz }: ResultsViewProps) => {
  const [results, setResults] = useState<QuizResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchResults();
  }, [paperName]);

  const fetchResults = async () => {
    try {
      // Fetch questions for the paper
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('paper_name', paperName)
        .order('question_no')
        .limit(100);

      if (questionsError) throw questionsError;

      // Fetch user answers for these questions
      const questionIds = questionsData?.map(q => q.id) || [];
      const { data: answersData, error: answersError } = await supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', user?.id)
        .in('question_id', questionIds);

      if (answersError) throw answersError;

      // Combine questions with user answers
      const questionsWithAnswers: QuestionWithAnswer[] = questionsData?.map(question => ({
        ...question,
        user_answer: answersData?.find(answer => answer.question_id === question.id)
      })) || [];

      // Calculate results
      const totalQuestions = questionsWithAnswers.length;
      const totalAttempted = questionsWithAnswers.filter(q => q.user_answer?.selected_option).length;
      const totalCorrect = questionsWithAnswers.filter(q => 
        q.user_answer?.selected_option === q.correct_option
      ).length;
      const scorePercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

      setResults({
        totalQuestions,
        totalAttempted,
        totalCorrect,
        scorePercentage,
        questions: questionsWithAnswers
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching results",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetQuiz = async () => {
    setResetting(true);
    
    try {
      // Use the database function to reset quiz answers
      const { error } = await supabase.rpc('reset_quiz_answers', {
        p_user_id: user?.id,
        p_paper_name: paperName
      });

      if (error) throw error;

      toast({
        title: "Quiz reset successfully",
        description: "You can now retake the quiz!"
      });
      
      onRetakeQuiz();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resetting quiz",
        description: error.message
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg">Loading results...</div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">No results found for {paperName}</p>
            <Button onClick={onBack}>Back to Papers</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Papers
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Quiz Results</h1>
            <p className="text-muted-foreground">{paperName}</p>
          </div>
          <Button onClick={handleResetQuiz} disabled={resetting}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {resetting ? 'Resetting...' : 'Reset Quiz'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.totalQuestions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Attempted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{results.totalAttempted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Correct</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{results.totalCorrect}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {results.scorePercentage.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <div className="mb-6">
          <Leaderboard paperName={paperName} />
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>
              Review your answers for each question
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {results.questions.map((question) => {
                const isCorrect = question.user_answer?.selected_option === question.correct_option;
                const isAttempted = question.user_answer?.selected_option;
                
                const getOptionText = (option: string) => {
                  switch (option) {
                    case 'A': return question.option_a;
                    case 'B': return question.option_b;
                    case 'C': return question.option_c;
                    case 'D': return question.option_d;
                    default: return option;
                  }
                };
                
                return (
                  <div key={question.id} className="flex items-start gap-3 p-4 rounded-lg border">
                    <div className="flex-shrink-0 mt-1">
                      {isAttempted ? (
                        isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-medium text-sm">Q{question.question_no}</span>
                        {isAttempted && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isCorrect 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                        {!isAttempted && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Not Attempted
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Question:</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {question.question}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {isAttempted && (
                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-xs font-medium text-blue-800 mb-1">Your Answer:</p>
                            <p className="text-sm text-blue-700">
                              <span className="font-medium">{question.user_answer?.selected_option}.</span> {getOptionText(question.user_answer?.selected_option || '')}
                            </p>
                          </div>
                        )}
                        
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-xs font-medium text-green-800 mb-1">Correct Answer:</p>
                          <p className="text-sm text-green-700">
                            <span className="font-medium">{question.correct_option}.</span> {getOptionText(question.correct_option)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};