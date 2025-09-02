
export type SchoolClass = {
  name: string;
  period: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
};

export type SchoolGrade = {
  name: string;
  classes: SchoolClass[];
};

export type School = {
  id: string;
  name: string;
  address: string;
  hash: string;
  schoolType: 'MUNICIPAL' | 'ESTADUAL' | 'MUNICIPALIZADA';
  status: 'Ativa' | 'Inativa';
  grades?: SchoolGrade[];
};
