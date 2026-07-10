/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { configService } from '@/common/config/configService';
import {
  HERMES_CURATED_MODELS,
} from '@/renderer/utils/model/agentRuntimeCatalog';
import { Checkbox, Tag } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hermes 모델 노출 설정 — Manggo custom Hermes agents 의 모델 드롭다운에
 * 노출할 모델을 운영자가 선택한다 ('hermes.enabledModels' client setting).
 * 아무것도 선택하지 않으면 전체 카탈로그가 노출된다(폴백).
 */
const HermesModelsSection: React.FC = () => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void configService.whenReady().then(() => {
      setEnabled(configService.get('hermes.enabledModels') ?? []);
      setReady(true);
    });
  }, []);

  const toggle = (id: string, checked: boolean) => {
    const next = checked ? [...enabled, id] : enabled.filter((v) => v !== id);
    setEnabled(next);
    void configService.set('hermes.enabledModels', next).catch((error) => {
      console.error('[HermesModelsSection] Failed to persist enabled models:', error);
    });
  };

  if (!ready) return null;

  const filterActive = enabled.length > 0;

  return (
    <div className='flex flex-col gap-8px rd-12px border border-border-2 p-16px'>
      <div className='flex items-center gap-8px'>
        <span className='text-14px font-600 text-t-primary'>
          {t('settings.hermesModels.title', { defaultValue: 'Hermes 모델 노출' })}
        </span>
        <Tag size='small' color={filterActive ? 'arcoblue' : 'gray'}>
          {filterActive
            ? t('settings.hermesModels.filtered', { defaultValue: `선택한 ${enabled.length}개만 노출` })
            : t('settings.hermesModels.all', { defaultValue: '전체 노출(기본)' })}
        </Tag>
      </div>
      <div className='text-12px text-t-secondary'>
        {t('settings.hermesModels.description', {
          defaultValue: 'Hermes 에이전트 대화의 모델 드롭다운에 표시할 모델을 선택합니다. 아무것도 선택하지 않으면 전체 목록이 표시됩니다.',
        })}
      </div>
      <div className='mt-8px flex flex-col gap-4px'>
        {HERMES_CURATED_MODELS.map((option) => (
          <label key={option.value} className='flex cursor-pointer items-center gap-8px py-2px'>
            <Checkbox checked={enabled.includes(option.value)} onChange={(checked) => toggle(option.value, checked)} />
            <span className='text-13px text-t-primary'>{option.label}</span>
            <span className='text-12px text-t-tertiary'>{option.description}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default HermesModelsSection;
