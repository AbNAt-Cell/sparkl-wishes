      {/* Add Item Dialog - More side padding on mobile */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="shadow-elegant w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Add a new item to your wishlist
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(95vh-10rem)] pr-4">
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* ... all form fields unchanged ... */}
              {/* (same as before - no changes here) */}
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog - Same increased padding */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the details of your wishlist item
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(95vh-10rem)] pr-4">
            <form onSubmit={handleEditItem} className="space-y-4">
              {/* ... all edit form fields unchanged ... */}
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Increased side padding */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <AlertDialogCancel className="w-full sm:w-auto h-11">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
