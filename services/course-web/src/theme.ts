import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';

const brandRamp: BrandVariants = {
  10: '#F3FAF9',
  20: '#E2F3F1',
  30: '#C8E5E2',
  40: '#A7D4CF',
  50: '#83C0B9',
  60: '#5EA9A1',
  70: '#3F918B',
  80: '#287D78',
  90: '#176B67',
  100: '#0F5B57',
  110: '#0A4C49',
  120: '#063E3C',
  130: '#053331',
  140: '#042927',
  150: '#03201F',
  160: '#021615',
};

const interfaceFont = "Aptos, 'Segoe UI', sans-serif";

function withCourseTokens(theme: Theme, dark: boolean): Theme {
  return {
    ...theme,
    fontFamilyBase: interfaceFont,
    fontFamilyNumeric: interfaceFont,
    colorNeutralBackground1: dark ? '#202D2A' : '#FFFFFF',
    colorNeutralBackground2: dark ? '#15201E' : '#F3F7F5',
    colorNeutralBackground3: dark ? '#293834' : '#E9F0ED',
    colorNeutralBackground4: dark ? '#32423D' : '#E1EAE6',
    colorNeutralForeground1: dark ? '#E7EFEC' : '#1D2A2A',
    colorNeutralForeground2: dark ? '#A8B7B0' : '#63716D',
    colorNeutralForeground3: dark ? '#83958D' : '#778680',
    colorNeutralStroke1: dark ? '#3A4B45' : '#D7E1DD',
    colorNeutralStroke2: dark ? '#33433E' : '#E3EAE7',
    colorBrandForeground1: dark ? '#68BBAF' : '#176B67',
    colorBrandBackground: dark ? '#68BBAF' : '#176B67',
    colorBrandBackgroundHover: dark ? '#83C8BE' : '#0F5B57',
    colorBrandBackgroundPressed: dark ? '#5EAFA4' : '#0A4C49',
  };
}

export const lightTheme = withCourseTokens(createLightTheme(brandRamp), false);
export const darkTheme = withCourseTokens(createDarkTheme(brandRamp), true);
