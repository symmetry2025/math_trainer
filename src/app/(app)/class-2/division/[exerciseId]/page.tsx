'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={2} op="division" basePath="/class-2/division" exerciseId={props.params.exerciseId} />;
}

