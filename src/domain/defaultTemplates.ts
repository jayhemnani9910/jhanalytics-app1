import type { Gender } from '../types';

export interface DefaultTemplate {
  name: string;
  gender?: Gender;
  fields: { label: string; unit: string }[];
}

const inch = (labels: string[]) => labels.map((label) => ({ label, unit: 'in' }));

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  { name: 'Blouse', gender: 'female', fields: inch(['Shoulder', 'Bust/Chest (round)', 'Waist (round)', 'Blouse Length', 'Front Neck Depth', 'Back Neck Depth', 'Sleeve Length', 'Sleeve Round (bicep)', 'Armhole (round)', 'Dart Point']) },
  { name: 'Kameez / Kurti', gender: 'female', fields: inch(['Kameez Length', 'Shoulder', 'Chest (round)', 'Waist (round)', 'Hip (round)', 'Front Neck Depth', 'Back Neck Depth', 'Sleeve Length', 'Sleeve Round', 'Armhole (round)']) },
  { name: 'Salwar / Churidar', gender: 'female', fields: inch(['Salwar Length', 'Waist (round)', 'Hip (round)', 'Thigh (round)', 'Knee (round)', 'Bottom / Ankle (round)']) },
  { name: 'Dress / Gown', gender: 'female', fields: inch(['Full Length', 'Shoulder', 'Bust (round)', 'Waist (round)', 'Waist Position', 'Hip (round)', 'Front Neck Depth', 'Back Neck Depth', 'Sleeve Length', 'Sleeve Round', 'Armhole (round)']) },
  { name: 'Shirt', gender: 'male', fields: inch(['Shirt Length', 'Collar / Neck (round)', 'Shoulder', 'Chest (round)', 'Waist (round)', 'Sleeve Length', 'Cuff / Sleeve Round', 'Front Yoke']) },
  { name: 'Pant / Trouser', gender: 'male', fields: inch(['Outseam Length', 'Waist (round)', 'Seat / Hip (round)', 'Thigh (round)', 'Knee (round)', 'Bottom (round)', 'Inseam', 'Crotch / Rise']) },
];
