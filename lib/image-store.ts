import { create } from "zustand"

interface ImageState {
  imageUrl: string | null
  imageFile: File | null
  imageName: string | null
  setImage: (url: string, file: File, name: string) => void
  clearImage: () => void
}

export const useImageStore = create<ImageState>((set) => ({
  imageUrl: null,
  imageFile: null,
  imageName: null,
  setImage: (url, file, name) => set({ imageUrl: url, imageFile: file, imageName: name }),
  clearImage: () => set({ imageUrl: null, imageFile: null, imageName: null }),
}))
