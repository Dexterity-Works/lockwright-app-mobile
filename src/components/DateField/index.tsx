import { ComponentProps } from 'react'

import { InputField } from 'lockwright-lib-ui-react-native-components'

export type DateFieldPickerMode = 'date' | 'time' | 'datetime' | 'month-year'

export type DateFieldProps = ComponentProps<typeof InputField> & {
  pickerMode?: DateFieldPickerMode
}

export const DateField = ({
  pickerMode: _pickerMode = 'date',
  ...props
}: DateFieldProps) => <InputField {...props} />
