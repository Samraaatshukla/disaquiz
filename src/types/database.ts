export type OptionEnum = 'A' | 'B' | 'C' | 'D';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  email: string;
  membership_number: string;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  paper_name: string;
  created_at: string;
}

export interface Question {
  id: string;
  question_no: number;
  paper_name: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionEnum;
  created_at: string;
}

export interface UserAnswer {
  id: string;
  user_id: string;
  question_id: string;
  selected_option: OptionEnum | null;
  is_submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithAnswer extends Question {
  user_answer?: UserAnswer;
}