import React from 'react'
import { Route, Routes } from 'react-router-dom'
import AnimalPage from './pages/Animals/AnimalPage'
import HomePage from './pages/Home/HomePage'
import CartPage from './pages/Cart/CartPage'

export default function AppRoutes() {
  return <Routes>
    <Route path='/' element={<HomePage />} />
    <Route path='/search/:searchTerm' element={<HomePage />} />
    <Route path='/tag/:tag' element={<HomePage />} />
    <Route path='/animals/:id' element={<AnimalPage />} />
    <Route path='/cart' element={<CartPage />} />
    </Routes>
}
