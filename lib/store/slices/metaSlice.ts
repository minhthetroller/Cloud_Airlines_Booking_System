import { createSlice } from "@reduxjs/toolkit"

// hydrated turns true once the session and the booking draft have been loaded from the server
const metaSlice = createSlice({
  name: "meta",
  initialState: { hydrated: false },
  reducers: {
    setHydrated: (state) => {
      state.hydrated = true
    },
  },
})

export const { setHydrated } = metaSlice.actions
export default metaSlice.reducer
