import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, UserCheck, AlertTriangle, Shield, ArrowLeft, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../AuthContext'

interface User {
    id: string
    email: string
    role: string
    enable: boolean
    createdAt: string
    lastLoginAt: string | null
}

interface AdminProps {
    onBack: () => void
}

export const Admin: React.FC<AdminProps> = ({ onBack }) => {
    const { t } = useTranslation()
    const { user: currentUser, token } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const usersPerPage = 10

    // 檢查用戶是否為管理員
    if (!currentUser || currentUser.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4">
                <div className="max-w-md w-full text-center">
                    <Shield className="h-16 w-16 mx-auto mb-4 text-red-500" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        權限不足
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        您需要管理員權限才能訪問此頁面
                    </p>
                </div>
            </div>
        )
    }

    // 獲取用戶列表
    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || '獲取用戶列表失敗')
            }

            const data = await response.json()
            setUsers(data.users)
        } catch (error) {
            setError(error instanceof Error ? error.message : '未知錯誤')
        } finally {
            setLoading(false)
        }
    }

    // 更新用戶角色
    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || '更新角色失敗')
            }

            // 重新獲取用戶列表
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : '更新角色失敗')
        }
    }

    // 刪除用戶
    const deleteUser = async (userId: string) => {
        if (!window.confirm('確定要刪除此用戶嗎？此操作無法復原。')) {
            return
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || '刪除用戶失敗')
            }

            // 重新獲取用戶列表
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : '刪除用戶失敗')
        }
    }

    // 切換用戶啟用狀態
    const toggleUserEnable = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/toggle-enable`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || '切換用戶狀態失敗')
            }

            // 重新獲取用戶列表
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : '切換用戶狀態失敗')
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    // 計算分頁數據
    const totalPages = Math.ceil(users.length / usersPerPage)
    const startIndex = (currentPage - 1) * usersPerPage
    const endIndex = startIndex + usersPerPage
    const currentUsers = users.slice(startIndex, endIndex)

    // 分頁控制函數
    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600 dark:text-gray-400">載入中...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
            <div className="max-w-6xl mx-auto">
                {/* 標題 */}
                <div className="mb-8">
                    <div className="flex items-center space-x-4 mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>返回聊天</span>
                        </button>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            用戶管理
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        管理系統中的所有用戶帳號
                    </p>
                </div>

                {/* 錯誤訊息 */}
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-300"
                        >
                            關閉
                        </button>
                    </div>
                )}

                {/* 用戶統計 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <Users className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    總用戶數
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <UserCheck className="h-8 w-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.filter(u => u.enable).length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    啟用用戶
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.filter(u => !u.enable).length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    禁用用戶
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <Shield className="h-8 w-8 text-purple-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.filter(u => u.role === 'admin').length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    管理員
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 用戶列表 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            用戶列表
                        </h2>
                    </div>

                    {/* 桌面版：表格 */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full min-w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        狀態
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        角色
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        註冊時間
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        最後登入
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {currentUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.enable
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {user.enable ? '啟用' : '禁用'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                }`}>
                                                {user.role === 'admin' ? '管理員' : '用戶'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.lastLoginAt
                                                ? new Date(user.lastLoginAt).toLocaleString('zh-TW')
                                                : '從未登入'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => toggleUserEnable(user.id)}
                                                className={`${user.enable
                                                    ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                                                    : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                    }`}
                                                title={user.enable ? '禁用用戶' : '啟用用戶'}
                                                disabled={user.id === currentUser?.id} // 不允許禁用自己
                                            >
                                                {user.enable ? <AlertTriangle className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                            </button>
                                            {user.role === 'user' ? (
                                                <button
                                                    onClick={() => updateUserRole(user.id, 'admin')}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="設為管理員"
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updateUserRole(user.id, 'user')}
                                                    className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                                    title="設為普通用戶"
                                                    disabled={users.filter(u => u.role === 'admin').length <= 1 && user.role === 'admin'}
                                                >
                                                    <UserCheck className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                                                title="刪除用戶"
                                                disabled={user.id === currentUser?.id} // 不允許刪除自己
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 手機版：卡片 */}
                    <div className="md:hidden space-y-4 p-4">
                        {currentUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>沒有用戶數據</p>
                            </div>
                        ) : (
                            currentUsers.map((user) => (
                                <div key={user.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {user.email}
                                            </div>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.enable
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {user.enable ? '啟用' : '禁用'}
                                            </span>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                }`}>
                                                {user.role === 'admin' ? '管理員' : '用戶'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <div>註冊時間: {new Date(user.createdAt).toLocaleDateString('zh-TW')}</div>
                                        <div>最後登入: {user.lastLoginAt
                                            ? new Date(user.lastLoginAt).toLocaleString('zh-TW')
                                            : '從未登入'
                                        }</div>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-3">
                                        <button
                                            onClick={() => toggleUserEnable(user.id)}
                                            className={`p-2 rounded-md ${user.enable
                                                ? 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900'
                                                : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900'
                                                }`}
                                            title={user.enable ? '禁用用戶' : '啟用用戶'}
                                            disabled={user.id === currentUser?.id}
                                        >
                                            {user.enable ? <AlertTriangle className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                        </button>
                                        {user.role === 'user' ? (
                                            <button
                                                onClick={() => updateUserRole(user.id, 'admin')}
                                                className="p-2 rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900"
                                                title="設為管理員"
                                            >
                                                <UserPlus className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateUserRole(user.id, 'user')}
                                                className="p-2 rounded-md text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900"
                                                title="設為普通用戶"
                                                disabled={users.filter(u => u.role === 'admin').length <= 1 && user.role === 'admin'}
                                            >
                                                <UserCheck className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="p-2 rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900"
                                            title="刪除用戶"
                                            disabled={user.id === currentUser?.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 分頁控制 */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    顯示第 {startIndex + 1} 到 {Math.min(endIndex, users.length)} 項，共 {users.length} 項
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        上一頁
                                    </button>

                                    {/* 頁碼按鈕 */}
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                                        if (pageNum > totalPages) return null
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => goToPage(pageNum)}
                                                className={`px-3 py-1 text-sm border rounded-md ${pageNum === currentPage
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    })}

                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        下一頁
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}