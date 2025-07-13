import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Plus, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OptionEnum = Database["public"]["Enums"]["option_enum"];

interface Question {
  paper_name: string;
  question_no: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionEnum;
}

export const QuestionUpload = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        paper_name: "",
        question_no: questions.length + 1,
        question: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_option: "A",
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: string | number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const uploadQuestions = async () => {
    if (questions.length === 0) {
      toast({
        variant: "destructive",
        title: "No questions to upload",
        description: "Please add at least one question.",
      });
      return;
    }

    // Validate all questions
    const invalidQuestions = questions.filter(
      (q) =>
        !q.paper_name.trim() ||
        !q.question.trim() ||
        !q.option_a.trim() ||
        !q.option_b.trim() ||
        !q.option_c.trim() ||
        !q.option_d.trim()
    );

    if (invalidQuestions.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid questions",
        description: "Please fill in all fields for all questions.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { error } = await supabase.from("questions").insert(questions);

      if (error) throw error;

      toast({
        title: "Questions uploaded successfully",
        description: `${questions.length} questions have been added. Papers have been auto-generated.`,
      });

      setQuestions([]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const parseCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header line
      const dataLines = lines.slice(1);
      
      const parsedQuestions: Question[] = dataLines.map((line, index) => {
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        
        return {
          paper_name: columns[0] || "",
          question_no: parseInt(columns[1]) || index + 1,
          question: columns[2] || "",
          option_a: columns[3] || "",
          option_b: columns[4] || "",
          option_c: columns[5] || "",
          option_d: columns[6] || "",
          correct_option: (columns[7] as OptionEnum) || "A",
        };
      });

      setQuestions(parsedQuestions);
      
      toast({
        title: "CSV parsed successfully",
        description: `${parsedQuestions.length} questions loaded from CSV.`,
      });
    };

    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={parseCSV}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              CSV format: paper_name, question_no, question, option_a, option_b, option_c, option_d, correct_option
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={addQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
            <Button 
              onClick={uploadQuestions} 
              disabled={isUploading || questions.length === 0}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : `Upload ${questions.length} Questions`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {questions.map((question, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Question {index + 1}</CardTitle>
              <Button
                onClick={() => removeQuestion(index)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paper Name</Label>
                <Input
                  value={question.paper_name}
                  onChange={(e) => updateQuestion(index, "paper_name", e.target.value)}
                  placeholder="e.g., Paper 32"
                />
              </div>
              <div>
                <Label>Question Number</Label>
                <Input
                  type="number"
                  value={question.question_no}
                  onChange={(e) => updateQuestion(index, "question_no", parseInt(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label>Question</Label>
              <Textarea
                value={question.question}
                onChange={(e) => updateQuestion(index, "question", e.target.value)}
                placeholder="Enter the question..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Option A</Label>
                <Input
                  value={question.option_a}
                  onChange={(e) => updateQuestion(index, "option_a", e.target.value)}
                  placeholder="Option A"
                />
              </div>
              <div>
                <Label>Option B</Label>
                <Input
                  value={question.option_b}
                  onChange={(e) => updateQuestion(index, "option_b", e.target.value)}
                  placeholder="Option B"
                />
              </div>
              <div>
                <Label>Option C</Label>
                <Input
                  value={question.option_c}
                  onChange={(e) => updateQuestion(index, "option_c", e.target.value)}
                  placeholder="Option C"
                />
              </div>
              <div>
                <Label>Option D</Label>
                <Input
                  value={question.option_d}
                  onChange={(e) => updateQuestion(index, "option_d", e.target.value)}
                  placeholder="Option D"
                />
              </div>
            </div>

            <div>
              <Label>Correct Option</Label>
              <Select
                value={question.correct_option}
                onValueChange={(value: OptionEnum) => updateQuestion(index, "correct_option", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};