import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'

type Locale = 'zh' | 'en'

// 优先使用保存的语言，其次使用浏览器语言
const getStoredLanguage = (): Locale => {
    const stored = localStorage.getItem('preferred-language')
    if (stored === 'zh' || stored === 'en') {
        return stored
    }
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const initialLocale = getStoredLanguage()

export const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: initialLocale,
    fallbackLocale: 'zh',
    messages: {
        zh,
        en
    }
})

document.documentElement.lang = initialLocale

export const supportedLocales = [
    { code: 'zh', name: '中文', nativeName: '中文' },
    { code: 'en', name: 'English', nativeName: 'English' }
] as const

// 切换语言的工具函数
export const switchLanguage = (locale: string) => {
    if (locale === 'zh' || locale === 'en') {
        i18n.global.locale.value = locale
        localStorage.setItem('preferred-language', locale)
        document.documentElement.lang = locale
    }
}

// 获取当前语言
export const getCurrentLanguage = () => {
    return i18n.global.locale.value
}
