'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={4} op="division" basePath="/class-4/division" exerciseId={props.params.exerciseId} />;
}

