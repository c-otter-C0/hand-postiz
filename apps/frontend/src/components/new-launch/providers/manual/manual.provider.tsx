'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { ManualSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/manual.dto';
import { Input } from '@gitroom/react/form/input';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

const ManualSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input
        label="Live URL (https, optional)"
        {...form.register('liveUrl')}
      />
      <Input label="Posted note (optional)" {...form.register('postedNote')} />
    </>
  );
};
export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: ManualSettings,
  CustomPreviewComponent: undefined,
  dto: ManualSettingsDto,
  maximumCharacters: 100000,
});
