export interface Panel {
  id: string;
  prompt: string;
  cameraType: string;
  duration: number;
  imageUrl?: string;
}

export interface Project {
  id?: string;
  name: string;
  panels: Panel[];
  characterRefs: string[];
  locationRefs: string[];
  updatedAt?: string;
  createdAt?: string;
}
