import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type Language = "en" | "vi"

const languageSlice = createSlice({
  name: "language",
  initialState: "en" as Language,
  reducers: {
    setLanguage: (_state, action: PayloadAction<Language>) => action.payload,
  },
})

export const { setLanguage } = languageSlice.actions
export default languageSlice.reducer
