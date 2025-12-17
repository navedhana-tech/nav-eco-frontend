import React, { useContext } from 'react'
import myContext from '../../context/data/myContext'
import { Truck, Gift, Tag } from 'lucide-react'

function Track() {
    const context = useContext(myContext)
    const { toggleMode, mode } = context
    return (
        <div className="py-8 px-2 bg-gradient-to-br from-pink-50 via-white to-green-50">
            <section className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    <div className="rounded-2xl bg-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all p-8 flex flex-col items-center text-center border-t-4 border-pink-400">
                        <Truck className="w-14 h-14 text-pink-500 mb-4" />
                        <h2 className="font-bold text-xl text-gray-900 mb-2">Fresh Vegetables</h2>
                        <p className="text-gray-600 text-base">Delivered within 8 hours of harvest</p>
                            </div>
                    <div className="rounded-2xl bg-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all p-8 flex flex-col items-center text-center border-t-4 border-green-400">
                        <Gift className="w-14 h-14 text-green-500 mb-4" />
                        <h2 className="font-bold text-xl text-gray-900 mb-2">Free Shipping</h2>
                        <p className="text-gray-600 text-base">We ship direct from Farmers</p>
                        </div>
                    <div className="rounded-2xl bg-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all p-8 flex flex-col items-center text-center border-t-4 border-yellow-400">
                        <Tag className="w-14 h-14 text-yellow-500 mb-4" />
                        <h2 className="font-bold text-xl text-gray-900 mb-2">Exciting Offers</h2>
                        <p className="text-gray-600 text-base">Your purchase profits the Farmers</p>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default Track