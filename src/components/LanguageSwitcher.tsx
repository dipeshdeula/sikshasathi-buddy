import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const isNepali = i18n.language === 'ne';

  const toggle = () => {
    i18n.changeLanguage(isNepali ? 'en' : 'ne');
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5 text-xs">
      <Globe className="h-4 w-4" />
      {isNepali ? 'EN' : 'ने'}
    </Button>
  );
};

export default LanguageSwitcher;
