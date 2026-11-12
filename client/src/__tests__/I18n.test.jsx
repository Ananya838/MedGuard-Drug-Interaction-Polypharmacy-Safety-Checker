import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider, useI18n } from '../context/I18nContext.jsx';

function TestI18nConsumer() {
  const { t, locale, toggleLocale } = useI18n();
  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="home-nav">{t('nav.home')}</span>
      <span data-testid="no-interaction">{t('common.noKnownInteractions')}</span>
      <button onClick={toggleLocale}>Toggle Language</button>
    </div>
  );
}

describe('I18nContext and Translations', () => {
  it('renders English text by default', () => {
    render(
      <I18nProvider>
        <TestI18nConsumer />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('home-nav')).toHaveTextContent('Home');
    expect(screen.getByTestId('no-interaction')).toHaveTextContent(
      'No known interaction found in our data.'
    );
  });

  it('switches to Hindi on toggle without mixing English/Hindi strings', () => {
    render(
      <I18nProvider>
        <TestI18nConsumer />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /toggle language/i }));

    expect(screen.getByTestId('current-locale')).toHaveTextContent('hi');
    expect(screen.getByTestId('home-nav')).toHaveTextContent('होम');
    expect(screen.getByTestId('no-interaction')).toHaveTextContent(
      'हमारे डेटा में कोई ज्ञात परस्पर क्रिया नहीं मिली।'
    );
  });
});

