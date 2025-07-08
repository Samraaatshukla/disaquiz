import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { QuestionWithAnswer, OptionEnum } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface QuizInterfaceProps {
  paperName: string;
  onSubmit: () => void;
  onBack: () => void;
}

export const QuizInterface = ({ paperName, onSubmit, onBack }: QuizInterfaceProps) => {
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchQuestions();
  }, [paperName]);

  const fetchQuestions = async () => {
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

      setQuestions(questionsWithAnswers);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching questions",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (selectedOption: OptionEnum) => {
    if (!user || !questions[currentIndex]) return;

    const question = questions[currentIndex];
    
    try {
      const { error } = await supabase
        .from('user_answers')
        .upsert({
          user_id: user.id,
          question_id: question.id,
          selected_option: selectedOption,
          is_submitted: false
        });

      if (error) throw error;

      // Update local state
      const updatedQuestions = [...questions];
      updatedQuestions[currentIndex] = {
        ...question,
        user_answer: {
          ...question.user_answer,
          id: question.user_answer?.id || '',
          user_id: user.id,
          question_id: question.id,
          selected_option: selectedOption,
          is_submitted: false,
          created_at: question.user_answer?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
      setQuestions(updatedQuestions);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving answer",
        description: error.message
      });
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    
    try {
      // Mark all answers as submitted
      const questionIds = questions.map(q => q.id);
      const { error: updateError } = await supabase
        .from('user_answers')
        .update({ is_submitted: true })
        .eq('user_id', user?.id)
        .in('question_id', questionIds);

      if (updateError) throw updateError;

      // Calculate results for leaderboard
      const totalQuestions = questions.length;
      const totalAttempted = questions.filter(q => q.user_answer?.selected_option).length;
      const totalCorrect = questions.filter(q => 
        q.user_answer?.selected_option === q.correct_option
      ).length;
      const scorePercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

      // Save to leaderboard
      const { error: leaderboardError } = await supabase
        .from('leaderboard')
        .insert({
          user_id: user?.id,
          paper_name: paperName,
          score_percentage: scorePercentage,
          total_questions: totalQuestions,
          total_correct: totalCorrect,
          total_attempted: totalAttempted
        });

      if (leaderboardError) throw leaderboardError;

      toast({
        title: "Quiz submitted successfully",
        description: "Check your results now!"
      });
      
      onSubmit();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error submitting quiz",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProgress = () => {
    const answered = questions.filter(q => q.user_answer?.selected_option).length;
    return (answered / questions.length) * 100;
  };

  const getAnsweredCount = () => {
    return questions.filter(q => q.user_answer?.selected_option).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg">Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">No questions found for {paperName}</p>
            <Button onClick={onBack}>Back to Papers</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

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
            <h1 className="text-2xl font-bold">{paperName}</h1>
            <p className="text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <Button onClick={handleSubmitQuiz} disabled={submitting}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Progress: {getAnsweredCount()} / {questions.length} answered
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(getProgress())}% complete
            </span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Question {currentQuestion.question_no}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-base leading-relaxed">{currentQuestion.question}</p>
            
            <RadioGroup
              value={currentQuestion.user_answer?.selected_option || ''}
              onValueChange={(value) => handleAnswerChange(value as OptionEnum)}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent">
                  <RadioGroupItem value="A" id="option-a" />
                  <Label htmlFor="option-a" className="flex-1 cursor-pointer">
                    A. {currentQuestion.option_a}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent">
                  <RadioGroupItem value="B" id="option-b" />
                  <Label htmlFor="option-b" className="flex-1 cursor-pointer">
                    B. {currentQuestion.option_b}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent">
                  <RadioGroupItem value="C" id="option-c" />
                  <Label htmlFor="option-c" className="flex-1 cursor-pointer">
                    C. {currentQuestion.option_c}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent">
                  <RadioGroupItem value="D" id="option-d" />
                  <Label htmlFor="option-d" className="flex-1 cursor-pointer">
                    D. {currentQuestion.option_d}
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === questions.length - 1}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};