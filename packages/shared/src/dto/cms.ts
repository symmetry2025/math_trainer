export interface StrapiAttributes {
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface StrapiEntity<T> {
  id: number;
  attributes: T & StrapiAttributes;
}

export interface StrapiResponse<T> {
  data: StrapiEntity<T>[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiMedia {
  data?: {
    attributes?: {
      url: string;
      [key: string]: any;
    };
  };
}

export interface BlogPostDto {
  title: string;
  slug: string;
  content: string;
  cover?: StrapiMedia;
}

export interface CourseDto {
  title: string;
  slug: string;
  content: string;
  cover?: StrapiMedia;
}

export interface TeacherCardDto {
  name: string;
  role: string;
  experience: string;
  description: string;
  subjects: string[];
  image?: StrapiMedia;
  order: number;
  isActive: boolean;
}
