import Link from 'next/link';

import { ArrowRight, Brain, Calculator, CheckCircle2, Clock, Rocket, Sparkles, Star, Target, Trophy, Users, Zap } from 'lucide-react';

import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { LandingDemoTrainer } from './LandingDemoTrainer';

const FEATURES = [
  {
    icon: Brain,
    title: 'Устный счёт',
    description: 'Тренажёры на сложение, вычитание, умножение и деление для развития навыков быстрого счёта',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Calculator,
    title: 'Вычисления в столбик',
    description: 'Пошаговое обучение сложению, вычитанию, умножению и делению многозначных чисел',
    color: 'from-primary to-primary/80',
  },
  {
    icon: Target,
    title: 'Адаптивная сложность',
    description: 'Система уровней от простого к сложному, которая растёт вместе с ребёнком',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Trophy,
    title: 'Игровые режимы',
    description: 'Точность, Скорость и Гонка — разные форматы для мотивации и интереса',
    color: 'from-accent to-orange-400',
  },
] as const;

const BENEFITS = [
  { icon: Zap, title: 'Мгновенная обратная связь', description: 'Ребёнок сразу видит, правильно ли решил пример' },
  { icon: Clock, title: 'Всего 10-15 минут в день', description: 'Короткие тренировки дают стабильный результат' },
  { icon: Users, title: 'Для 2-6 классов', description: 'Программа охватывает всю школьную математику' },
  { icon: Star, title: 'Система достижений', description: 'Награды и прогресс мотивируют заниматься регулярно' },
] as const;

const TESTIMONIALS = [
  {
    text: 'Сын теперь сам просит позаниматься математикой! Раньше это была настоящая проблема.',
    author: 'Мария К.',
    role: 'мама ученика 3 класса',
  },
  {
    text: 'Таблицу умножения выучили за 2 недели. Очень удобный формат тренажёров.',
    author: 'Алексей П.',
    role: 'папа ученицы 2 класса',
  },
  {
    text: 'Дочка полюбила считать в столбик благодаря пошаговым подсказкам.',
    author: 'Елена С.',
    role: 'мама ученицы 4 класса',
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30">
                <Calculator className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Математика станет{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">любимым предметом</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Интерактивные тренажёры для школьников 2-6 классов. Устный счёт, таблица умножения, вычисления в столбик — всё
              в игровой форме.
            </p>

            <div className="flex justify-center mb-5">
              <div className="inline-flex flex-col items-center gap-1 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium text-center sm:flex-row sm:gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                  Бесплатный доступ ко всем тренажёрам до 1 марта
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center mb-12 max-w-md mx-auto">
              <Link href="/login" className="w-full sm:w-auto inline-flex">
                <Button
                  size="lg"
                  className="w-full sm:w-auto justify-center whitespace-nowrap text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                >
                  <Rocket className="w-5 h-5" />
                  Начать бесплатно
                </Button>
              </Link>
              <a href="#features" className="w-full sm:w-auto inline-flex">
                <Button size="lg" variant="outline" className="w-full sm:w-auto justify-center whitespace-nowrap text-lg px-8 py-6 rounded-xl">
                  Узнать больше
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">50+</div>
                <div className="text-sm text-muted-foreground">тренажёров</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">4</div>
                <div className="text-sm text-muted-foreground">игровых режима</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">2-6</div>
                <div className="text-sm text-muted-foreground">классы</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Всё для успешной учёбы</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Комплексный подход к изучению математики: от базовых навыков до сложных вычислений
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-card text-center sm:text-left">
                <CardContent className="p-6">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform mx-auto sm:mx-0`}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
                  Почему родители выбирают МатТренер?
                </h2>
                <div className="space-y-6">
                  {BENEFITS.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <benefit.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                        <p className="text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-w-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                <Card className="relative bg-card border-0 shadow-2xl rounded-3xl overflow-hidden">
                  <CardContent className="p-4 sm:p-8">
                    <div className="text-center text-sm font-semibold text-muted-foreground mb-3">Попробуйте сами!</div>
                    <div className="bg-muted/50 rounded-2xl p-4 sm:p-6">
                      <LandingDemoTrainer total={10} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Три режима тренировки</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Разные форматы занятий для разных целей и настроения</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-card border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Точность</h3>
                <p className="text-muted-foreground">Решай без спешки, главное — не ошибаться. Идеально для закрепления новой темы.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Скорость</h3>
                <p className="text-muted-foreground">Успей решить все примеры за отведённое время. Развивает автоматизм.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Гонка</h3>
                <p className="text-muted-foreground">Соревнуйся с виртуальным соперником. Азарт и мотивация!</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Что говорят родители</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index} className="bg-card border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-primary to-primary/80">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Готовы начать?</h2>
            <p className="text-xl text-primary-foreground/80 mb-8">Присоединяйтесь к тысячам школьников, которые уже полюбили математику</p>
            <Link href="/login" className="inline-flex">
              <Button size="lg" variant="outline" className="whitespace-nowrap text-lg px-8 py-6 rounded-xl shadow-xl hover:shadow-2xl transition-all bg-card/95">
                <Rocket className="w-5 h-5" />
                Начать заниматься бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">МатТренер</span>
            </div>
            <div className="text-sm text-muted-foreground">© 2026 МатТренер. Все права защищены.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

