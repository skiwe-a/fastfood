'use client';

import { useState, useEffect } from 'react';

interface SwiperHeroProps {
  onSlideChange: (index: number) => void;
}

const heroSlides = [
  { outlineText: 'DOUBLE', solidText: 'BURGER', color: 'red', image: '/images/food/burger.png', desc: 'استمتع بطعم اللحم البقري المشوي مع طبقات الجبن الذائب والخضروات الطازجة في خبزنا المحضر يومياً.', price: '$12.80', time: '10-18 دقيقة', rating: '4.9', timeColor: 'bg-red-100 text-red-600', ratingColor: 'bg-amber-100 text-amber-600', btnColor: 'bg-red-600' },
  { outlineText: 'FAMILY', solidText: 'PIZZA', color: 'amber', image: '/images/food/pizza.png', desc: 'بيتزا إيطالية أصلية مغطاة بأجود أنواع الموزاريلا والخضروات الطازجة المقطوعة يدوياً.', price: '$18.50', time: '15-25 دقيقة', rating: '4.8', timeColor: 'bg-amber-100 text-amber-600', ratingColor: 'bg-green-100 text-green-600', btnColor: 'bg-amber-500' },
  { outlineText: 'CHICKEN', solidText: 'SANDWICH', color: 'green', image: '/images/food/sandwich.png', desc: 'ساندوتش دجاج مقرمش مع صوص خاص يمنحك تجربة لا تُنسى في كل قضمة.', price: '$24.30', time: '8-12 دقيقة', rating: '4.7', timeColor: 'bg-green-100 text-green-600', ratingColor: 'bg-amber-100 text-amber-600', btnColor: 'bg-green-500' },
];

const colorMap: Record<string, string> = {
  red: 'text-red-600',
  amber: 'text-amber-500',
  green: 'text-green-500',
};

export default function SwiperHero({ onSlideChange }: SwiperHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let swiperInstance: any = null;
    const initSwiper = async () => {
      const { default: Swiper } = await import('swiper');
      const { Autoplay, Pagination, Parallax, EffectFade } = await import('swiper/modules');
      await import('swiper/css');
      await import('swiper/css/effect-fade');
      await import('swiper/css/pagination');
      await import('swiper/css/parallax');

      const el = document.querySelector('.mySwiper') as HTMLElement;
      if (!el || el.swiper) return;

      Swiper.use([Autoplay, Pagination, Parallax, EffectFade]); // eslint-disable-line react-hooks/rules-of-hooks

      swiperInstance = new Swiper('.mySwiper', {
        speed: 1200,
        parallax: true,
        grabCursor: true,
        effect: 'fade',
        fadeEffect: { crossFade: true },
        autoplay: { delay: 6000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true },
        on: {
          slideChange: function (this: any) {
            setActiveIndex(this.activeIndex);
            onSlideChange(this.activeIndex);
          },
        },
      });
    };
    initSwiper();
    return () => { if (swiperInstance) swiperInstance.destroy(true, true); };
  }, []);

  const goToSlide = (index: number) => {
    const el = document.querySelector('.mySwiper') as any;
    if (el?.swiper) el.swiper.slideTo(index);
  };

  const thumbItems = [
    { image: '/images/food/burger.png', label: 'برجر' },
    { image: '/images/food/pizza.png', label: 'بيتزا' },
    { image: '/images/food/sandwich.png', label: 'ساندوتش' },
  ];

  return (
    <div className="relative">
      <div className="swiper mySwiper">
        <div className="swiper-wrapper">
          {heroSlides.map((slide, idx) => (
            <div className="swiper-slide" key={idx}>
              <div className="slide-layout">
                <div className="content-side pr-4 md:pr-10" data-swiper-parallax="-300" data-swiper-parallax-duration="1200">
                  <h2 className={`outline-text ${colorMap[slide.color]} text-4xl md:text-6xl font-black mb-0 leading-none`}>{slide.outlineText}</h2>
                  <h1 className={`${colorMap[slide.color]} text-6xl md:text-8xl font-black mb-6 leading-none`}>{slide.solidText}</h1>
                  <p className="text-gray-600 text-base md:text-lg max-w-md mb-8" data-swiper-parallax="-200">{slide.desc}</p>
                  <div className="text-3xl md:text-4xl font-bold mb-8" data-swiper-parallax="-100">إجمالي : <span className="price-tag text-red-600">{slide.price}</span></div>
                  <button className="bg-zinc-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl flex items-center gap-3 hover:bg-black transition transform hover:scale-105 shadow-xl">
                    <span className={`${slide.btnColor} p-2 rounded-lg`}>
                      <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M17.21 9l-4.38-6.56c-.19-.28-.51-.42-.83-.42-.32 0-.64.14-.83.43L6.79 9H2c-.55 0-1 .45-1 1 0 .09.01.18.04.27l2.54 9.27c.23.84 1 1.46 1.92 1.46h13c.92 0 1.69-.62 1.93-1.46l2.54-9.27L23 10c0-.55-.45-1-1-1h-4.79zM9 9l3-4.4L15 9H9z"/></svg>
                    </span>
                    شراء الآن
                  </button>
                </div>
                <div className="image-side relative flex justify-center items-center h-64 md:h-auto" data-swiper-parallax="200" data-swiper-parallax-duration="1200">
                  <div className="absolute top-0 md:top-10 right-4 md:right-20 flex flex-col md:flex-row gap-2 md:gap-4 z-10">
                    <div className={`${slide.timeColor} px-3 py-1 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs md:text-sm font-bold shadow-sm`}>
                      <span>⏱️ {slide.time}</span>
                    </div>
                    <div className={`${slide.ratingColor} px-3 py-1 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs md:text-sm font-bold shadow-sm`}>
                      <span>⭐ {slide.rating}</span>
                    </div>
                  </div>
                  <img src={slide.image} alt={slide.solidText} className="food-image" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="swiper-pagination !bottom-4 md:!bottom-8"></div>
      </div>

      {/* Thumbnail Navigation */}
      <div className="absolute bottom-6 md:bottom-10 right-1/2 translate-x-1/2 md:translate-x-0 md:right-10 flex gap-4 md:gap-6 z-40">
        {thumbItems.map((thumb, idx) => (
          <div key={idx} data-aos="fade-up" data-aos-delay={idx * 200 + 100}>
            <div
              className={`menu-thumb bg-white p-2 md:p-3 rounded-2xl md:rounded-3xl flex flex-col items-center gap-1 shadow-lg ${activeIndex === idx ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
            >
              <img src={thumb.image} className="w-10 h-8 md:w-12 md:h-10 object-contain drop-shadow-md" alt={thumb.label} />
              <span className="text-[10px] md:text-[12px] font-bold text-gray-800">{thumb.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
