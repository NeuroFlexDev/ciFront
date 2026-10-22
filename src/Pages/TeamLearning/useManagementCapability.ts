import { useLearningData } from '../Learning/useLearningData';

export function useManagementCapability() {
  const resource = useLearningData<{ version: number; tenant_archive_restore: boolean; webhook_update: boolean }>('/team/management-capabilities');
  return { ...resource, supported: resource.data?.version === 1 && resource.data.tenant_archive_restore === true && resource.data.webhook_update === true && !resource.error };
}
